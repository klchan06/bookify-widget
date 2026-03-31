import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { env } from '../utils/env.js';
import { validate } from '../middleware/validate.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  salonName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

router.post('/register', validate(registerSchema), async (req, res: Response, next) => {
  try {
    const { salonName, ownerName, email, password, phone } = req.body;

    const existingEmployee = await prisma.employee.findFirst({
      where: { email },
    });
    if (existingEmployee) {
      res.status(409).json({ success: false, error: 'Dit e-mailadres is al in gebruik' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let slug = generateSlug(salonName);

    // Ensure unique slug
    const existingSlug = await prisma.salon.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const salon = await prisma.salon.create({
      data: {
        name: salonName,
        slug,
        email,
        phone,
        address: '',
        city: '',
        postalCode: '',
        settings: {
          create: {},
        },
        employees: {
          create: {
            name: ownerName,
            email,
            phone,
            role: 'owner',
            passwordHash,
          },
        },
      },
      include: { employees: true },
    });

    // Create default email templates
    const defaultTemplates = [
      {
        salonId: salon.id,
        type: 'booking_confirmation',
        subject: 'Uw afspraak is bevestigd',
        body: `<p>Geachte %KLANT.NAAM%,</p>
<p>Hierbij bevestigen wij uw afspraak voor <strong>%AFSPRAAK.DIENST%</strong> op <strong>%AFSPRAAK.DATUM%</strong> om <strong>%AFSPRAAK.TIJD%</strong>.</p>
<p>Medewerker: %AFSPRAAK.MEDEWERKER%<br>Duur: %AFSPRAAK.DUUR% minuten<br>Prijs: %AFSPRAAK.PRIJS%</p>
<p>Locatie: %SALON.ADRES%, %SALON.STAD%</p>
<p>Wilt u uw afspraak annuleren of wijzigen? Neem dan contact met ons op.</p>
<p>Met vriendelijke groet,<br>%SALON.NAAM%</p>`,
      },
      {
        salonId: salon.id,
        type: 'booking_reminder',
        subject: 'Herinnering aan uw afspraak',
        body: `<p>Geachte %KLANT.NAAM%,</p>
<p>Graag maken wij u er op attent dat u binnenkort een afspraak bij ons heeft voor <strong>%AFSPRAAK.DIENST%</strong>.</p>
<p>Datum: %AFSPRAAK.DATUM%<br>Tijd: %AFSPRAAK.TIJD%<br>Medewerker: %AFSPRAAK.MEDEWERKER%</p>
<p>We zien u graag!</p>
<p>Met vriendelijke groet,<br>%SALON.NAAM%</p>`,
      },
      {
        salonId: salon.id,
        type: 'booking_cancellation',
        subject: 'Bevestiging van annulering',
        body: `<p>Geachte %KLANT.NAAM%,</p>
<p>Hierbij bevestigen wij de annulering van uw afspraak voor <strong>%AFSPRAAK.DIENST%</strong> op <strong>%AFSPRAAK.DATUM%</strong> om %AFSPRAAK.TIJD%.</p>
<p>Wilt u een nieuwe afspraak maken? Boek eenvoudig online via onze website.</p>
<p>Met vriendelijke groet,<br>%SALON.NAAM%</p>`,
      },
      {
        salonId: salon.id,
        type: 'booking_update',
        subject: 'Je afspraak is verzet',
        body: `<p>Geachte %KLANT.NAAM%,</p>
<p>Hierbij bevestigen wij uw nieuwe afspraak voor <strong>%AFSPRAAK.DIENST%</strong> op <strong>%AFSPRAAK.DATUM%</strong> om <strong>%AFSPRAAK.TIJD%</strong>.</p>
<p>Medewerker: %AFSPRAAK.MEDEWERKER%</p>
<p>Met vriendelijke groet,<br>%SALON.NAAM%</p>`,
      },
    ];

    await prisma.emailTemplate.createMany({ data: defaultTemplates });

    const employee = salon.employees[0];

    const token = jwt.sign(
      {
        id: employee.id,
        salonId: salon.id,
        employeeId: employee.id,
        email: employee.email,
        role: employee.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: employee.id,
          salonId: salon.id,
          employeeId: employee.id,
          email: employee.email,
          role: employee.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res: Response, next) => {
  try {
    const { email, password } = req.body;

    const employee = await prisma.employee.findFirst({
      where: { email, isActive: true },
    });

    if (!employee || !employee.passwordHash) {
      res.status(401).json({ success: false, error: 'Ongeldige inloggegevens' });
      return;
    }

    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Ongeldige inloggegevens' });
      return;
    }

    const token = jwt.sign(
      {
        id: employee.id,
        salonId: employee.salonId,
        employeeId: employee.id,
        email: employee.email,
        role: employee.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: employee.id,
          salonId: employee.salonId,
          employeeId: employee.id,
          email: employee.email,
          role: employee.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.employeeId },
      include: { salon: true },
    });

    if (!employee) {
      res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: employee.id,
        salonId: employee.salonId,
        employeeId: employee.id,
        email: employee.email,
        role: employee.role,
        name: employee.name,
        salon: employee.salon,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
