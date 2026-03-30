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

// Global middleware
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'development' ? true : env.CORS_ORIGINS,
  credentials: true,
}));
app.use(express.json());

// Rate limiting for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Te veel verzoeken, probeer het later opnieuw' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, error: 'Te veel boekingen, probeer het later opnieuw' },
});

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
app.listen(env.PORT, () => {
  console.log(`Bookify API running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

// Start cron jobs
startReminderCron();

export default app;
