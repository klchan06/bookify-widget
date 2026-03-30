import { Router, Response } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate.js';
import { getAvailableSlots } from '../services/availability.service.js';

const router = Router();

const availabilityQuerySchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// GET /api/availability?salonId=&serviceId=&date=&employeeId=
router.get('/', validateQuery(availabilityQuerySchema), async (req, res: Response, next) => {
  try {
    const { salonId, serviceId, employeeId, date } = req.query as {
      salonId: string;
      serviceId: string;
      employeeId?: string;
      date: string;
    };

    const slots = await getAvailableSlots({ salonId, serviceId, employeeId, date });

    res.json({
      success: true,
      data: {
        date,
        slots,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
