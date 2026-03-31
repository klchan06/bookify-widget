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
import crypto from 'crypto';

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
  privateNotes: z.string().optional(),
});

const updateBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  employeeId: z.string().uuid().optional(),
  notes: z.string().optional(),
  privateNotes: z.string().optional(),
});

const recurringBookingSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  privateNotes: z.string().optional(),
  recurring: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    days: z.array(z.number().min(0).max(6)).optional(),
    endAfter: z.number().int().min(1).max(52).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
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
    const { salonId, serviceId, date, startTime, customerName, customerEmail, customerPhone, notes, privateNotes } = req.body;
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

    // Smart customer dedup: match on email OR phone
    let customer = await prisma.customer.findFirst({
      where: {
        salonId,
        OR: [
          { email: customerEmail },
          ...(customerPhone ? [{ phone: customerPhone }] : []),
        ],
      },
    });

    if (customer) {
      // Update existing customer with latest info
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone || customer.phone,
        },
      });
    } else {
      // Generate customer number
      const lastCustomer = await prisma.customer.findFirst({
        where: { salonId },
        orderBy: { createdAt: 'desc' },
        select: { customerNumber: true },
      });
      const nextNum = lastCustomer?.customerNumber
        ? parseInt(lastCustomer.customerNumber.replace('C', '')) + 1
        : 1;
      const customerNumber = `C${String(nextNum).padStart(6, '0')}`;

      // Split name into first/last
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      customer = await prisma.customer.create({
        data: {
          salonId,
          customerNumber,
          firstName,
          lastName,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
      });
    }

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
        privateNotes,
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

// POST /api/bookings/recurring - Authenticated endpoint for recurring bookings
router.post('/recurring', authenticate, validate(recurringBookingSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      salonId, serviceId, employeeId, date, startTime,
      customerName, customerEmail, customerPhone, notes, privateNotes,
      recurring,
    } = req.body;

    // Get service
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      res.status(404).json({ success: false, error: 'Dienst niet gevonden' });
      return;
    }

    // Smart customer dedup: match on email OR phone
    let customer = await prisma.customer.findFirst({
      where: {
        salonId,
        OR: [
          { email: customerEmail },
          ...(customerPhone ? [{ phone: customerPhone }] : []),
        ],
      },
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone || customer.phone,
        },
      });
    } else {
      const lastCustomer = await prisma.customer.findFirst({
        where: { salonId },
        orderBy: { createdAt: 'desc' },
        select: { customerNumber: true },
      });
      const nextNum = lastCustomer?.customerNumber
        ? parseInt(lastCustomer.customerNumber.replace('C', '')) + 1
        : 1;
      const customerNumber = `C${String(nextNum).padStart(6, '0')}`;

      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      customer = await prisma.customer.create({
        data: {
          salonId,
          customerNumber,
          firstName,
          lastName,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
      });
    }

    // Generate dates based on recurring rule
    const dates: string[] = [];
    const startDate = new Date(date + 'T00:00:00');
    const maxOccurrences = recurring.endAfter || 52;
    const endDate = recurring.endDate ? new Date(recurring.endDate + 'T23:59:59') : null;

    let current = new Date(startDate);
    while (dates.length < maxOccurrences) {
      if (endDate && current > endDate) break;

      const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon...
      const shouldInclude =
        !recurring.days || recurring.days.length === 0 || recurring.days.includes(dayOfWeek);

      if (shouldInclude) {
        const y = current.getFullYear();
        const mo = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dates.push(`${y}-${mo}-${d}`);
      }

      // Advance based on frequency
      if (recurring.frequency === 'weekly') {
        if (recurring.days && recurring.days.length > 0) {
          current.setDate(current.getDate() + 1);
          // If we've gone past the week, jump to next week start
        } else {
          current.setDate(current.getDate() + 7);
        }
      } else if (recurring.frequency === 'biweekly') {
        current.setDate(current.getDate() + 14);
      } else if (recurring.frequency === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      }
    }

    const recurringGroupId = crypto.randomUUID();
    const endTime = minutesToTime(timeToMinutes(startTime) + service.duration);
    const createdBookings = [];

    for (const bookingDate of dates) {
      // Check availability
      const slots = await getAvailableSlots({ salonId, serviceId, employeeId, date: bookingDate });
      const isAvailable = slots.some((s) => s.time === startTime && s.available);
      if (!isAvailable) continue; // Skip unavailable dates

      const booking = await prisma.booking.create({
        data: {
          salonId,
          employeeId,
          serviceId,
          customerId: customer.id,
          date: bookingDate,
          startTime,
          endTime,
          notes,
          privateNotes,
          status: 'confirmed',
          isRecurring: true,
          recurringRule: JSON.stringify(recurring),
          recurringGroupId,
        },
        include: { employee: true, service: true, customer: true, salon: true },
      });

      createdBookings.push(booking);
    }

    // Update customer stats
    if (createdBookings.length > 0) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalBookings: { increment: createdBookings.length },
          lastVisit: new Date(),
        },
      });

      // Send confirmation for first booking
      const emailData = await buildEmailData(createdBookings[0].id);
      if (emailData) {
        sendBookingConfirmation(emailData).catch(console.error);
        sendBookingNotification(emailData).catch(console.error);
      }
    }

    res.status(201).json({
      success: true,
      data: createdBookings,
      message: `${createdBookings.length} van ${dates.length} afspraken aangemaakt`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const salonId = req.user!.salonId;
    const today = new Date().toISOString().split('T')[0];

    // Calculate start of week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekEnd = sunday.toISOString().split('T')[0];

    // Calculate start of month
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

    const [todayCount, weekCount, monthBookings, totalCustomers] = await Promise.all([
      prisma.booking.count({
        where: { salonId, date: today, status: { not: 'cancelled' } },
      }),
      prisma.booking.count({
        where: { salonId, date: { gte: weekStart, lte: weekEnd }, status: { not: 'cancelled' } },
      }),
      prisma.booking.findMany({
        where: { salonId, date: { gte: monthStart, lte: monthEnd }, status: { in: ['confirmed', 'completed'] } },
        include: { service: true },
      }),
      prisma.customer.count({ where: { salonId } }),
    ]);

    const monthRevenue = monthBookings.reduce((sum: number, b: { service: { price: number } }) => sum + b.service.price, 0);

    res.json({
      success: true,
      data: { todayCount, weekCount, monthRevenue, totalCustomers },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings - Auth required
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { date, employeeId, status, startDate, endDate, page = '1', pageSize = '20' } = req.query;

    const where: Record<string, unknown> = { salonId: req.user!.salonId };
    if (date) {
      where.date = date;
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, string>).gte = startDate as string;
      if (endDate) (where.date as Record<string, string>).lte = endDate as string;
    }
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
    if (req.body.privateNotes !== undefined) updateData.privateNotes = req.body.privateNotes;

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

    // Update customer totalSpent when booking is completed
    if (status === 'completed' && booking.customer) {
      const completedBookings = await prisma.booking.findMany({
        where: { customerId: booking.customerId, status: 'completed' },
        include: { service: true },
      });
      const totalSpent = completedBookings.reduce((sum: number, b: { service: { price: number } }) => sum + b.service.price, 0);
      await prisma.customer.update({
        where: { id: booking.customerId },
        data: { totalSpent, lastVisit: new Date() },
      });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, cancelReason } = req.body;
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
      data: { status, ...(cancelReason ? { cancelReason } : {}) },
      include: { employee: true, service: true, customer: true },
    });
    if (status === 'cancelled') {
      const emailData = await buildEmailData(booking.id);
      if (emailData) sendBookingCancellation(emailData).catch(console.error);
    }

    // Update customer totalSpent when booking is completed
    if (status === 'completed' && booking.customer) {
      const completedBookings = await prisma.booking.findMany({
        where: { customerId: booking.customerId, status: 'completed' },
        include: { service: true },
      });
      const totalSpent = completedBookings.reduce((sum: number, b: { service: { price: number } }) => sum + b.service.price, 0);
      await prisma.customer.update({
        where: { id: booking.customerId },
        data: { totalSpent, lastVisit: new Date() },
      });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

export default router;
