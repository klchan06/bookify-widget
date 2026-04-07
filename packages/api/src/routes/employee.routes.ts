import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { validate } from '../middleware/validate.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const employeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['owner', 'admin', 'employee']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const workingHoursSchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    isWorking: z.boolean(),
  }),
);

const breakSchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
);

const specialDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isOff: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().optional(),
});

// GET /api/employees?salonId=...
router.get('/', optionalAuth, async (req, res: Response, next) => {
  try {
    const salonId = (req.query.salonId as string) || (req as AuthRequest).user?.salonId;
    if (!salonId) {
      res.status(400).json({ success: false, error: 'salonId is verplicht' });
      return;
    }

    const serviceId = req.query.serviceId as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    const employees = await prisma.employee.findMany({
      where: {
        salonId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(serviceId ? { employeeServices: { some: { serviceId } } } : {}),
      },
      select: {
        id: true, salonId: true, name: true, email: true, phone: true,
        avatarUrl: true, role: true, isActive: true, createdAt: true,
        employeeServices: { include: { service: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: employees });
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res: Response, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, salonId: true, name: true, email: true, phone: true,
        avatarUrl: true, role: true, isActive: true, createdAt: true,
        workingHours: true, breaks: true, specialDays: true,
        employeeServices: { include: { service: true } },
      },
    });

    if (!employee) {
      res.status(404).json({ success: false, error: 'Medewerker niet gevonden' });
      return;
    }

    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees
router.post('/', authenticate, validate(employeeSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { password, ...data } = req.body;
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    const salonId = req.user!.salonId;

    const employee = await prisma.employee.create({
      data: {
        ...data,
        salonId,
        passwordHash,
      },
    });

    // Auto-link to all active services so the new employee appears in the widget
    const services = await prisma.service.findMany({
      where: { salonId, isActive: true },
      select: { id: true },
    });
    if (services.length > 0) {
      await prisma.employeeService.createMany({
        data: services.map((s: { id: string }) => ({
          employeeId: employee.id,
          serviceId: s.id,
        })),
      });
    }

    // Create default working hours (Tue-Sat 09:00-18:00, Sun-Mon off)
    await prisma.workingHours.createMany({
      data: [
        { employeeId: employee.id, dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isWorking: false },
        { employeeId: employee.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: false },
        { employeeId: employee.id, dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isWorking: true },
        { employeeId: employee.id, dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isWorking: true },
        { employeeId: employee.id, dayOfWeek: 4, startTime: '09:00', endTime: '20:00', isWorking: true },
        { employeeId: employee.id, dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isWorking: true },
        { employeeId: employee.id, dayOfWeek: 6, startTime: '09:00', endTime: '17:00', isWorking: true },
      ],
    });

    res.status(201).json({
      success: true,
      data: { ...employee, passwordHash: undefined },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id
router.put('/:id', authenticate, validate(employeeSchema.partial()), async (req: AuthRequest, res: Response, next) => {
  try {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Medewerker niet gevonden' });
      return;
    }

    const { password, ...data } = req.body;
    const updateData: Record<string, unknown> = { ...data };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      data: { ...employee, passwordHash: undefined },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Medewerker niet gevonden' });
      return;
    }

    await prisma.employee.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Medewerker gedeactiveerd' });
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id/working-hours
router.get('/:id/working-hours', async (req, res: Response, next) => {
  try {
    const hours = await prisma.workingHours.findMany({
      where: { employeeId: req.params.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json({ success: true, data: hours });
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id/working-hours
router.put('/:id/working-hours', authenticate, (req, _res, next) => {
  if (!Array.isArray(req.body) && req.body.hours) req.body = req.body.hours;
  next();
}, validate(workingHoursSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const employeeId = req.params.id;
    const hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean }> = Array.isArray(req.body) ? req.body : req.body.hours;

    // Delete existing and recreate
    await prisma.workingHours.deleteMany({ where: { employeeId } });
    await prisma.workingHours.createMany({
      data: hours.map((h) => ({ ...h, employeeId })),
    });

    const result = await prisma.workingHours.findMany({
      where: { employeeId },
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id/breaks
router.get('/:id/breaks', async (req, res: Response, next) => {
  try {
    const breaks = await prisma.employeeBreak.findMany({
      where: { employeeId: req.params.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json({ success: true, data: breaks });
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id/breaks
router.put('/:id/breaks', authenticate, (req, _res, next) => {
  if (!Array.isArray(req.body) && req.body.breaks) req.body = req.body.breaks;
  next();
}, validate(breakSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const employeeId = req.params.id;
    const breaks: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = Array.isArray(req.body) ? req.body : req.body.breaks;

    await prisma.employeeBreak.deleteMany({ where: { employeeId } });
    await prisma.employeeBreak.createMany({
      data: breaks.map((b) => ({ ...b, employeeId })),
    });

    const result = await prisma.employeeBreak.findMany({
      where: { employeeId },
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees/:id/special-days
router.post('/:id/special-days', authenticate, validate(specialDaySchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const employeeId = req.params.id;

    const specialDay = await prisma.specialDay.upsert({
      where: { employeeId_date: { employeeId, date: req.body.date } },
      create: { ...req.body, employeeId },
      update: req.body,
    });

    res.status(201).json({ success: true, data: specialDay });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id/special-days/:dayId
router.delete('/:id/special-days/:dayId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
    });
    if (!employee) {
      res.status(404).json({ success: false, error: 'Medewerker niet gevonden' });
      return;
    }
    await prisma.specialDay.delete({ where: { id: req.params.dayId } });
    res.json({ success: true, message: 'Speciale dag verwijderd' });
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id/special-days
router.get('/:id/special-days', async (req, res: Response, next) => {
  try {
    const specialDays = await prisma.specialDay.findMany({
      where: { employeeId: req.params.id },
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: specialDays });
  } catch (err) {
    next(err);
  }
});

export default router;
