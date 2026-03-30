import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate } from '../middleware/validate.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateSalonSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
});

const updateSettingsSchema = z.object({
  bookingLeadTime: z.number().int().min(0).optional(),
  bookingWindow: z.number().int().min(1).optional(),
  cancellationWindow: z.number().int().min(0).optional(),
  slotDuration: z.number().int().min(5).optional(),
  allowEmployeeChoice: z.boolean().optional(),
  requirePhone: z.boolean().optional(),
  confirmationEmailEnabled: z.boolean().optional(),
  reminderEmailEnabled: z.boolean().optional(),
  reminderHoursBefore: z.number().int().min(1).optional(),
  widgetPrimaryColor: z.string().optional(),
  widgetAccentColor: z.string().optional(),
  widgetBorderRadius: z.number().int().min(0).optional(),
  widgetFontFamily: z.string().optional(),
});

// GET /api/salon?slug=... (public)
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { slug, id } = req.query;

    let salon;
    if (slug) {
      salon = await prisma.salon.findUnique({ where: { slug: slug as string } });
    } else if (id) {
      salon = await prisma.salon.findUnique({ where: { id: id as string } });
    } else {
      res.status(400).json({ success: false, error: 'slug of id is verplicht' });
      return;
    }

    if (!salon) {
      res.status(404).json({ success: false, error: 'Salon niet gevonden' });
      return;
    }

    res.json({ success: true, data: salon });
  } catch (err) {
    next(err);
  }
});

// PUT /api/salon
router.put('/', authenticate, validate(updateSalonSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const salon = await prisma.salon.update({
      where: { id: req.user!.salonId },
      data: req.body,
    });

    res.json({ success: true, data: salon });
  } catch (err) {
    next(err);
  }
});

// GET /api/salon/settings
router.get('/settings', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const settings = await prisma.salonSettings.findUnique({
      where: { salonId: req.user!.salonId },
    });

    if (!settings) {
      res.status(404).json({ success: false, error: 'Instellingen niet gevonden' });
      return;
    }

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/salon/settings
router.put('/settings', authenticate, validate(updateSettingsSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const settings = await prisma.salonSettings.upsert({
      where: { salonId: req.user!.salonId },
      create: { salonId: req.user!.salonId, ...req.body },
      update: req.body,
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// GET /api/salon/widget-config/:salonId (public)
router.get('/widget-config/:salonId', async (req: Request, res: Response, next) => {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: req.params.salonId },
    });

    if (!salon) {
      res.status(404).json({ success: false, error: 'Salon niet gevonden' });
      return;
    }

    const settings = await prisma.salonSettings.findUnique({
      where: { salonId: req.params.salonId },
    });

    const config = {
      salonId: salon.id,
      salonName: salon.name,
      apiUrl: '',  // Set by the client
      primaryColor: settings?.widgetPrimaryColor || '#6366f1',
      accentColor: settings?.widgetAccentColor || '#8b5cf6',
      borderRadius: settings?.widgetBorderRadius || 8,
      fontFamily: settings?.widgetFontFamily || 'Inter, sans-serif',
      locale: 'nl' as const,
      showPrices: true,
      showDuration: true,
      allowEmployeeChoice: settings?.allowEmployeeChoice ?? true,
      requirePhone: settings?.requirePhone ?? true,
    };

    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

export default router;
