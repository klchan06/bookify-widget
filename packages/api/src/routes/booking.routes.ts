import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate } from '../middleware/validate.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getAvailableSlots } from '../services/availability.service.js';
import {
  sendBookingConfirmation,
  sendBookingNotification,
  sendBookingCancellation,
  sendBookingUpdate,
} from '../services/email.service.js';
import { syncBookingToGoogle } from '../services/calendar.service.js';

const router = Router();

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const createBookingSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

const updateBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  employeeId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

async function buildEmailData(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { employee: true, service: true, customer: true, salon: true },
  });
  if (!booking) return null;
  return {
    customerName: booking.customer.name,
    customerEmail: booking.customer.email,
    salonName: booking.salon.name,
    salonEmail: booking.salon.email,
    employeeName: booking.employee.name,
    serviceName: booking.service.name,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    price: booking.service.price,
    currency: booking.service.currency,
  };
}

// POST /api/bookings - Public endpoint
router.post('/', validate(createBookingSchema), async (req: Request, res: Response, next) => {
  try {
    const { salonId, serviceId, date, startTime, customerName, customerEmail, customerPhone, notes } = req.body;
    let { employeeId } = req.body;

    // Get service
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      res.status(404).json({ success: false, error: 'Dienst niet gevonden' });
      return;
    }

    // If no employee specified, find one who is available
    if (!employeeId) {
      const slots = await getAvailableSlots({ salonId, serviceId, date });
      const matchingSlot = slots.find((s) => s.time === startTime && s.available);
      if (!matchingSlot || !matchingSlot.employeeId) {
        res.status(400).json({ success: false, error: 'Geen beschikbare medewerker voor dit tijdstip' });
        return;
      }
      employeeId = matchingSlot.employeeId;
    } else {
      // Verify the slot is available for the specified employee
      const slots = await getAvailableSlots({ salonId, serviceId, employeeId, date });
      const isAvailable = slots.some((s) => s.time === startTime && s.available);
      if (!isAvailable) {
        res.status(400).json({ success: false, error: 'Dit tijdstip is niet meer beschikbaar' });
        return;
      }
    }

    // Calculate end time
    const endTime = minutesToTime(timeToMinutes(startTime) + service.duration);

    // Find or create customer
    const customer = await prisma.customer.upsert({
      where: { email_salonId: { email: customerEmail, salonId } },
      create: {
        salonId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      update: {
        name: customerName,
        phone: customerPhone || undefined,
      },
    });

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        salonId,
        employeeId,
        serviceId,
        customerId: customer.id,
        date,
        startTime,
        endTime,
        notes,
        status: 'confirmed',
      },
      include: { employee: true, service: true, customer: true, salon: true },
    });

    // Update customer stats
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalBookings: { increment: 1 },
        lastVisit: new Date(),
      },
    });

    // Send emails (non-blocking)
    const emailData = await buildEmailData(booking.id);
    if (emailData) {
      sendBookingConfirmation(emailData).catch(console.error);
      sendBookingNotification(emailData).catch(console.error);
    }

    // Sync to Google Calendar (non-blocking)
    syncBookingToGoogle(booking.id).catch(console.error);

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings - Auth required
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { date, employeeId, status, page = '1', pageSize = '20' } = req.query;

    const where: Record<string, unknown> = { salonId: req.user!.salonId };
    if (date) where.date = date;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { employee: true, service: true, customer: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      success: true,
      data: bookings,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
      include: { employee: true, service: true, customer: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Afspraak niet gevonden' });
      return;
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id - Reschedule
router.put('/:id', authenticate, validate(updateBookingSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const existing = await prisma.booking.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
      include: { service: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Afspraak niet gevonden' });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (req.body.date) updateData.date = req.body.date;
    if (req.body.startTime) {
      updateData.startTime = req.body.startTime;
      updateData.endTime = minutesToTime(timeToMinutes(req.body.startTime) + existing.service.duration);
    }
    if (req.body.employeeId) updateData.employeeId = req.body.employeeId;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: updateData,
      include: { employee: true, service: true, customer: true },
    });

    const emailData = await buildEmailData(booking.id);
    if (emailData) {
      sendBookingUpdate(emailData).catch(console.error);
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', async (req: Request, res: Response, next) => {
  try {
    const { cancelReason } = req.body || {};

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        status: 'cancelled',
        cancelReason,
      },
      include: { employee: true, service: true, customer: true },
    });

    const emailData = await buildEmailData(booking.id);
    if (emailData) {
      sendBookingCancellation(emailData).catch(console.error);
    }

    res.json({ success: true, data: booking, message: 'Afspraak geannuleerd' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id/status
router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'no_show', 'completed'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: 'Ongeldige status' });
      return;
    }

    const existing = await prisma.booking.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Afspraak niet gevonden' });
      return;
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: { employee: true, service: true, customer: true },
    });

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

export default router;
