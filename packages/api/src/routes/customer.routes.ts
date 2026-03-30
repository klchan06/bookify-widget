import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/customers
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { search, page = '1', pageSize = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);

    const where: Record<string, unknown> = { salonId: req.user!.salonId };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
      include: {
        bookings: {
          include: { employee: true, service: true },
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Klant niet gevonden' });
      return;
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

export default router;
