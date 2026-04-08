import cron from 'node-cron';
import { prisma } from '../utils/prisma.js';
import { sendBookingReminder } from './email.service.js';

export function startReminderCron(): void {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[Reminder] Checking for upcoming appointments...');

    try {
      // Get all salons with reminder enabled
      const salonsWithReminders = await prisma.salonSettings.findMany({
        where: { reminderEmailEnabled: true },
        include: { salon: true },
      });

      for (const settings of salonsWithReminders) {
        const hoursBefore = settings.reminderHoursBefore;
        const now = new Date();
        const reminderTarget = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

        const targetDate = reminderTarget.toISOString().split('T')[0];
        const targetHour = reminderTarget.getHours();
        const targetTimeStart = `${targetHour.toString().padStart(2, '0')}:00`;
        const targetTimeEnd = `${targetHour.toString().padStart(2, '0')}:59`;

        const bookings = await prisma.booking.findMany({
          where: {
            salonId: settings.salonId,
            date: targetDate,
            startTime: { gte: targetTimeStart, lte: targetTimeEnd },
            status: { in: ['pending', 'confirmed'] },
          },
          include: {
            employee: true,
            service: true,
            customer: true,
            salon: true,
          },
        });

        for (const booking of bookings) {
          await sendBookingReminder({
            bookingId: booking.id,
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            salonId: booking.salon.id,
            salonName: booking.salon.name,
            salonEmail: booking.salon.email,
            salonAddress: booking.salon.address,
            salonCity: booking.salon.city,
            salonPhone: booking.salon.phone,
            employeeName: booking.employee.name,
            serviceName: booking.service.name,
            serviceDuration: booking.service.duration,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            price: booking.service.price,
            currency: booking.service.currency,
          });
        }

        if (bookings.length > 0) {
          console.log(`[Reminder] Sent ${bookings.length} reminders for ${settings.salon.name}`);
        }
      }
    } catch (err) {
      console.error('[Reminder] Error:', err);
    }
  });

  console.log('[Reminder] Cron job started - checking every hour');

  // Keep-alive: ping ourselves every 10 minutes to prevent Render free tier
  // from spinning down after 15 min of inactivity (which causes 30-60s cold starts)
  const selfUrl = process.env.APP_URL;
  if (selfUrl && selfUrl.startsWith('http')) {
    cron.schedule('*/10 * * * *', async () => {
      try {
        await fetch(`${selfUrl}/api/health`);
      } catch {
        // Ignore - this is just a keep-alive
      }
    });
    console.log(`[KeepAlive] Self-ping scheduled every 10 min → ${selfUrl}/api/health`);
  }
}
