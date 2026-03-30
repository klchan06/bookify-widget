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
