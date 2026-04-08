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

// Escape special characters per RFC 5545
function icalEscape(text: string): string {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function formatICalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function generateICal(salon: any, bookings: any[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boekgerust//NL',
    `X-WR-CALNAME:${icalEscape(salon.name)} - Afspraken`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Embed VTIMEZONE for Europe/Amsterdam so iOS handles DST correctly
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Amsterdam',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ];

  const now = formatICalDate(new Date());

  for (const booking of bookings) {
    const dtStart = `${booking.date.replace(/-/g, '')}T${booking.startTime.replace(':', '')}00`;
    const dtEnd = `${booking.date.replace(/-/g, '')}T${booking.endTime.replace(':', '')}00`;

    const customer = booking.customer?.name || 'Klant';
    const service = booking.service?.name || 'Afspraak';
    const employee = booking.employee?.name || '';

    // Include employee in summary so concurrent bookings look distinct in iOS Calendar
    const summary = employee
      ? `${customer} - ${service} (${employee})`
      : `${customer} - ${service}`;

    const description = [
      `Klant: ${customer}`,
      `Dienst: ${service}`,
      `Medewerker: ${employee || '-'}`,
      `Telefoon: ${booking.customer?.phone || '-'}`,
      `Email: ${booking.customer?.email || '-'}`,
      ...(booking.notes ? [`Notities: ${booking.notes}`] : []),
    ].join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:booking-${booking.id}@boekgerust.nl`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;TZID=Europe/Amsterdam:${dtStart}`);
    lines.push(`DTEND;TZID=Europe/Amsterdam:${dtEnd}`);
    lines.push(`SUMMARY:${icalEscape(summary)}`);
    lines.push(`DESCRIPTION:${icalEscape(description)}`);
    if (salon.address) {
      lines.push(`LOCATION:${icalEscape(salon.address + (salon.city ? ', ' + salon.city : ''))}`);
    }
    lines.push(`STATUS:${booking.status === 'confirmed' ? 'CONFIRMED' : booking.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`);
    lines.push('SEQUENCE:0');
    lines.push('TRANSP:OPAQUE');
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
