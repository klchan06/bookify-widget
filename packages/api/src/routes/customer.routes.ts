import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/customers
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { search, page = '1', pageSize = '20', includeInactive } = req.query;

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);

    const where: Record<string, unknown> = { salonId: req.user!.salonId };
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
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

// GET /api/customers/search
router.get('/search', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const query = (req.query.q || req.query.search || '') as string;
    const customers = await prisma.customer.findMany({
      where: {
        salonId: req.user!.salonId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/export - Export all customers as JSON
router.get('/export', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { salonId: req.user!.salonId, isActive: true },
      include: { bookings: { select: { id: true, date: true, service: { select: { name: true, price: true } } } } },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers - Create customer manually
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const salonId = req.user!.salonId;
    const { firstName, lastName, email, phone, dateOfBirth, address, city, postalCode, gender, notes } = req.body;

    // Check for duplicates
    const existing = await prisma.customer.findFirst({
      where: {
        salonId,
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });
    if (existing) {
      res.status(409).json({ success: false, error: 'Klant met dit e-mailadres of telefoonnummer bestaat al', data: existing });
      return;
    }

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

    const name = `${firstName || ''} ${lastName || ''}`.trim();

    // Email is required by schema; synthesize placeholder when only phone provided
    const safeEmail = email || `noemail-${phone || Date.now()}@local.invalid`;

    const customer = await prisma.customer.create({
      data: {
        salonId,
        customerNumber,
        firstName,
        lastName,
        name: name || email || phone || 'Klant',
        email: safeEmail,
        phone,
        dateOfBirth,
        address,
        city,
        postalCode,
        gender,
        notes,
      },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers/import - Import customers from CSV/JSON (optimized for large batches)
router.post('/import', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const salonId = req.user!.salonId;
    const { customers } = req.body;

    if (!Array.isArray(customers) || customers.length === 0) {
      res.status(400).json({ success: false, error: 'Geen klanten opgegeven' });
      return;
    }

    let imported = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    // Pre-fetch all existing customers for this salon - dedup lookup is now O(1) instead of O(n)
    const allExisting = await prisma.customer.findMany({
      where: { salonId },
      select: { id: true, email: true, phone: true, name: true, firstName: true, lastName: true, customerNumber: true },
    });

    // Build lookup maps
    const byEmail = new Map<string, typeof allExisting[number]>();
    const byPhone = new Map<string, typeof allExisting[number]>();
    for (const c of allExisting) {
      if (c.email) byEmail.set(c.email.toLowerCase(), c);
      if (c.phone) byPhone.set(c.phone.replace(/[\s-]/g, ''), c);
    }

    // Find next customer number
    let nextNum = 1;
    for (const c of allExisting) {
      if (c.customerNumber) {
        const n = parseInt(c.customerNumber.replace(/\D/g, ''));
        if (!isNaN(n) && n >= nextNum) nextNum = n + 1;
      }
    }

    // Track new emails/phones added in this batch to avoid duplicates within the import
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const toCreate: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];

    for (const c of customers) {
      try {
        const email = (c.email || '').trim().toLowerCase();
        const phone = (c.phone || '').replace(/[\s-]/g, '');

        if (!email && !phone) {
          skipped++;
          if (errors.length < 10) errors.push(`${c.name || 'Onbekend'}: geen e-mail of telefoon`);
          continue;
        }

        // Check for existing customer in DB
        const existing = (email && byEmail.get(email)) || (phone && byPhone.get(phone));

        if (existing) {
          toUpdate.push({
            id: existing.id,
            data: {
              name: c.name || existing.name,
              firstName: c.firstName || existing.firstName,
              lastName: c.lastName || existing.lastName,
              ...(phone && { phone }),
              ...(email && { email }),
              ...(c.dateOfBirth && { dateOfBirth: c.dateOfBirth }),
              ...(c.address && { address: c.address }),
              ...(c.city && { city: c.city }),
              ...(c.postalCode && { postalCode: c.postalCode }),
              ...(c.gender && { gender: c.gender }),
            },
          });
          updated++;
        } else {
          // Check for duplicate within this import batch
          if (email && seenEmails.has(email)) {
            skipped++;
            if (errors.length < 10) errors.push(`${c.name || email}: duplicaat in import bestand`);
            continue;
          }
          if (phone && seenPhones.has(phone)) {
            skipped++;
            if (errors.length < 10) errors.push(`${c.name || phone}: duplicaat in import bestand`);
            continue;
          }

          if (email) seenEmails.add(email);
          if (phone) seenPhones.add(phone);

          // Email is required by schema - synthesize one if missing
          const finalEmail = email || `noemail-${phone || nextNum}@local.invalid`;

          toCreate.push({
            salonId,
            customerNumber: `C${String(nextNum).padStart(6, '0')}`,
            name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || finalEmail,
            firstName: c.firstName || null,
            lastName: c.lastName || null,
            email: finalEmail,
            phone: phone || null,
            dateOfBirth: c.dateOfBirth || null,
            address: c.address || null,
            city: c.city || null,
            postalCode: c.postalCode || null,
            gender: c.gender || null,
            notes: c.notes || null,
          });
          nextNum++;
          imported++;
        }
      } catch (e) {
        skipped++;
        if (errors.length < 10) errors.push(`${c.name || c.email || 'Onbekend'}: ${(e as Error).message}`);
      }
    }

    // Bulk insert new customers (chunks of 500)
    for (let i = 0; i < toCreate.length; i += 500) {
      const chunk = toCreate.slice(i, i + 500);
      await prisma.customer.createMany({ data: chunk, skipDuplicates: true });
    }

    // Bulk update existing customers (one query each, but in parallel)
    const updateChunks: typeof toUpdate[] = [];
    for (let i = 0; i < toUpdate.length; i += 50) {
      updateChunks.push(toUpdate.slice(i, i + 50));
    }
    for (const chunk of updateChunks) {
      await Promise.all(
        chunk.map((u) =>
          prisma.customer.update({ where: { id: u.id }, data: u.data }).catch(() => null)
        )
      );
    }

    res.json({
      success: true,
      data: { imported, updated, skipped, total: customers.length, errors: errors.slice(0, 10) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers/merge - Merge duplicate customers
router.post('/merge', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { keepId, mergeIds } = req.body;
    if (!keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      res.status(400).json({ success: false, error: 'keepId en mergeIds zijn verplicht' });
      return;
    }

    const salonId = req.user!.salonId;

    // Verify all customers belong to this salon
    const keep = await prisma.customer.findFirst({ where: { id: keepId, salonId } });
    if (!keep) {
      res.status(404).json({ success: false, error: 'Hoofdklant niet gevonden' });
      return;
    }

    // Move all bookings from merge customers to keep customer
    await prisma.booking.updateMany({
      where: { customerId: { in: mergeIds }, salonId },
      data: { customerId: keepId },
    });

    // Recalculate stats
    const bookingCount = await prisma.booking.count({ where: { customerId: keepId } });
    const totalSpentResult = await prisma.booking.findMany({
      where: { customerId: keepId, status: { in: ['confirmed', 'completed'] } },
      include: { service: true },
    });
    const totalSpent = totalSpentResult.reduce((sum: number, b: { service: { price: number } }) => sum + b.service.price, 0);

    await prisma.customer.update({
      where: { id: keepId },
      data: { totalBookings: bookingCount, totalSpent },
    });

    // Soft-delete merged customers
    await prisma.customer.updateMany({
      where: { id: { in: mergeIds }, salonId },
      data: { isActive: false },
    });

    res.json({ success: true, message: `${mergeIds.length} klant(en) samengevoegd` });
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

// GET /api/customers/:id/bookings
router.get('/:id/bookings', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { customerId: req.params.id, salonId: req.user!.salonId },
      include: { employee: true, service: true },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, salonId: req.user!.salonId },
    });
    if (!customer) {
      res.status(404).json({ success: false, error: 'Klant niet gevonden' });
      return;
    }

    const { firstName, lastName, name, email, phone, dateOfBirth, address, city, postalCode, gender, notes, tags, isActive } = req.body;

    const updatedName = name || (firstName && lastName ? `${firstName} ${lastName}` : customer.name);

    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        name: updatedName,
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(postalCode !== undefined && { postalCode }),
        ...(gender !== undefined && { gender }),
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/customers/:id - Soft delete (deactivate)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.customer.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Klant gedeactiveerd' });
  } catch (err) {
    next(err);
  }
});

export default router;
