import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { validate } from '../middleware/validate.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration: z.number().int().min(5),
  price: z.number().int().min(0),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  employeeIds: z.array(z.string().uuid()).optional(),
});

// GET /api/services?salonId=...
router.get('/', optionalAuth, async (req, res: Response, next) => {
  try {
    const salonId = (req.query.salonId as string) || (req as AuthRequest).user?.salonId;
    if (!salonId) {
      res.status(400).json({ success: false, error: 'salonId is verplicht' });
      return;
    }

    const services = await prisma.service.findMany({
      where: { salonId, isActive: true },
      include: {
        employeeServices: {
          include: { employee: { select: { id: true, name: true, avatarUrl: true, isActive: true } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const result = services.map((s: typeof services[number]) => ({
      ...s,
      employees: s.employeeServices
        .map((es: typeof s.employeeServices[number]) => es.employee)
        .filter((e: { isActive: boolean }) => e.isActive),
      employeeServices: undefined,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/services
router.post('/', authenticate, validate(serviceSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { employeeIds, ...data } = req.body;

    const service = await prisma.service.create({
      data: {
        ...data,
        salonId: req.user!.salonId,
        currency: 'EUR',
        employeeServices: employeeIds?.length
          ? { create: employeeIds.map((eid: string) => ({ employeeId: eid })) }
          : undefined,
      },
      include: { employeeServices: true },
    });

    res.status(201).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

// PUT /api/services/reorder
router.put('/reorder', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      res.status(400).json({ success: false, error: 'ids array is verplicht' });
      return;
    }
    await Promise.all(
      ids.map((id: string, index: number) =>
        prisma.service.update({ where: { id }, data: { sortOrder: index + 1 } })
      )
    );
    res.json({ success: true, message: 'Volgorde bijgewerkt' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/services/:id
router.put('/:id', authenticate, validate(serviceSchema.partial()), async (req: AuthRequest, res: Response, next) => {
  try {
    const { employeeIds, ...data } = req.body;

    // Verify ownership
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Dienst niet gevonden' });
      return;
    }

    // Update employee assignments if provided
    if (employeeIds) {
      await prisma.employeeService.deleteMany({ where: { serviceId: req.params.id } });
      await prisma.employeeService.createMany({
        data: employeeIds.map((eid: string) => ({ employeeId: eid, serviceId: req.params.id })),
      });
    }

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
      include: { employeeServices: true },
    });

    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Dienst niet gevonden' });
      return;
    }

    await prisma.service.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Dienst verwijderd' });
  } catch (err) {
    next(err);
  }
});

export default router;
