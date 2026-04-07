import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  disconnectGoogle,
  syncBookingToGoogle,
} from '../services/calendar.service.js';
import { prisma } from '../utils/prisma.js';
import { env } from '../utils/env.js';

const router = Router();

// ===== iCal Feed =====

function generateICal(salon: any, bookings: any[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boekgerust//Boekgerust Widget//NL',
    `X-WR-CALNAME:${salon.name} - Afspraken`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const booking of bookings) {
    const dtStart = `${booking.date.replace(/-/g, '')}T${booking.startTime.replace(':', '')}00`;
    const dtEnd = `${booking.date.replace(/-/g, '')}T${booking.endTime.replace(':', '')}00`;
    const created = new Date(booking.createdAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${booking.id}@boekgerust`);
    lines.push(`DTSTART;TZID=Europe/Amsterdam:${dtStart}`);
    lines.push(`DTEND;TZID=Europe/Amsterdam:${dtEnd}`);
    lines.push(`DTSTAMP:${created}`);
    lines.push(`SUMMARY:${booking.customer?.name || 'Klant'} - ${booking.service?.name || 'Afspraak'}`);
    lines.push(`DESCRIPTION:Klant: ${booking.customer?.name || '-'}\\nDienst: ${booking.service?.name || '-'}\\nMedewerker: ${booking.employee?.name || '-'}\\nTelefoon: ${booking.customer?.phone || '-'}\\nEmail: ${booking.customer?.email || '-'}${booking.notes ? '\\nNotities: ' + booking.notes : ''}`);
    if (salon.address) {
      lines.push(`LOCATION:${salon.address}${salon.city ? ', ' + salon.city : ''}`);
    }
    lines.push(`STATUS:${booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// GET /api/calendar/feed/:token.ics - Public iCal feed
router.get('/feed/:token.ics', async (req: Request, res: Response, next) => {
  try {
    const token = req.params.token;

    let salonId: string;
    let employeeId: string | null;

    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const parts = decoded.split(':');
      salonId = parts[0];
      employeeId = parts[1] === 'all' ? null : parts[1];
    } catch {
      res.status(400).send('Ongeldige feed URL');
      return;
    }

    // Verify salon exists
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) {
      res.status(404).send('Salon niet gevonden');
      return;
    }

    // Get bookings (next 90 days + past 30 days)
    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - 30);
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 90);

    const where: any = {
      salonId,
      date: {
        gte: pastDate.toISOString().split('T')[0],
        lte: futureDate.toISOString().split('T')[0],
      },
      status: { not: 'cancelled' },
    };
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: { customer: true, service: true, employee: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Generate iCal
    const ical = generateICal(salon, bookings);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="boekgerust-calendar.ics"');
    res.send(ical);
  } catch (err) {
    next(err);
  }
});

// GET /api/calendar/feed-url - Get the iCal feed URL for current user
router.get('/feed-url', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const salonId = req.user!.salonId;
    const employeeId = req.user!.employeeId;

    // Generate tokens for both personal and full salon feed
    const personalToken = Buffer.from(`${salonId}:${employeeId}`).toString('base64url');
    const salonToken = Buffer.from(`${salonId}:all`).toString('base64url');

    const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : env.APP_URL;

    res.json({
      success: true,
      data: {
        personalFeed: `${baseUrl}/api/calendar/feed/${personalToken}.ics`,
        salonFeed: `${baseUrl}/api/calendar/feed/${salonToken}.ics`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ===== Google Calendar =====

// GET /api/calendar/google/auth-url
router.get('/google/auth-url', authenticate, async (req: AuthRequest, res: Response) => {
  const url = getGoogleAuthUrl(req.user!.employeeId);
  res.json({ success: true, data: { url } });
});

// GET /api/calendar/google/callback
router.get('/google/callback', async (req: Request, res: Response, next) => {
  try {
    const { code, state: employeeId } = req.query;

    if (!code || !employeeId) {
      res.status(400).json({ success: false, error: 'Code en state zijn verplicht' });
      return;
    }

    await handleGoogleCallback(code as string, employeeId as string);

    // Redirect to dashboard with success
    res.redirect(`${env.APP_URL}/settings/calendar?connected=true`);
  } catch (err) {
    next(err);
  }
});

// POST /api/calendar/google/sync
router.post('/google/sync', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { bookingId } = req.body;

    if (bookingId) {
      await syncBookingToGoogle(bookingId);
    } else {
      // Sync all upcoming bookings for this employee
      const today = new Date().toISOString().split('T')[0];
      const bookings = await prisma.booking.findMany({
        where: {
          employeeId: req.user!.employeeId,
          date: { gte: today },
          status: { in: ['pending', 'confirmed'] },
        },
      });

      for (const booking of bookings) {
        await syncBookingToGoogle(booking.id);
      }
    }

    res.json({ success: true, message: 'Synchronisatie voltooid' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/calendar/google/disconnect
router.delete('/google/disconnect', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    await disconnectGoogle(req.user!.employeeId);
    res.json({ success: true, message: 'Google Calendar losgekoppeld' });
  } catch (err) {
    next(err);
  }
});

export default router;
