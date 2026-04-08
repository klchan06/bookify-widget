// Load .env BEFORE any other imports that read process.env
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = resolve(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
} catch (err) {
  console.warn('[env] Could not load .env file:', (err as Error).message);
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './utils/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startReminderCron } from './services/reminder.service.js';

import authRoutes from './routes/auth.routes.js';
import serviceRoutes from './routes/service.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import customerRoutes from './routes/customer.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import salonRoutes from './routes/salon.routes.js';

const app = express();

// Trust proxy (Render uses x-forwarded-proto for HTTPS)
app.set('trust proxy', 1);

// Global middleware - helmet with relaxed CSP so iCal feed works in Apple Calendar
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
  }),
);

// CORS: allow dev locally, * wildcard, vercel.app subdomains, and specific origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // In dev: allow everything
    if (env.NODE_ENV === 'development') return callback(null, true);

    // Check explicit allow list
    const allowed = env.CORS_ORIGINS.map((o) => o.trim()).filter(Boolean);

    // Wildcard
    if (allowed.includes('*')) return callback(null, true);

    // Exact match
    if (allowed.includes(origin)) return callback(null, true);

    // Allow any vercel.app preview deployment
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return callback(null, true);

    // Allow boekgerust.nl and any subdomain
    if (/^https:\/\/(.*\.)?boekgerust\.nl$/.test(origin)) return callback(null, true);

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));

// Rate limiting - only in production
const publicLimiter = env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { success: false, error: 'Te veel verzoeken, probeer het later opnieuw' },
    })
  : (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();

const bookingLimiter = env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 20,
      message: { success: false, error: 'Te veel boekingen, probeer het later opnieuw' },
      skip: (req) => req.method !== 'POST',
    })
  : (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', publicLimiter, serviceRoutes);
app.use('/api/employees', publicLimiter, employeeRoutes);
app.use('/api/bookings', bookingLimiter, bookingRoutes);
app.use('/api/availability', publicLimiter, availabilityRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/salon', publicLimiter, salonRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Boekgerust API running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

// Start cron jobs
startReminderCron();

export default app;
