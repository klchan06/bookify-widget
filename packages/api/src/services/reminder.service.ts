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

  // Keep-alive ONLY during business hours (08:00 - 21:00 Europe/Amsterdam)
  // Render free tier: 750 hours/month limit
  // 13 hours/day × 31 days = 403 hours/month → safe with room for builds + redeploys
  // Outside these hours: service spins down (cold start when first request comes in)
  // This ensures we stay within the free tier even with 31-day months and multiple deploys
  const selfUrl = process.env.APP_URL;
  if (selfUrl && selfUrl.startsWith('http')) {
    // Cron format: minute hour * * * (every 10 min, hours 8-20, every day)
    // Note: Render servers run in UTC. Europe/Amsterdam is UTC+1 (CET) or UTC+2 (CEST)
    // We use 7-19 UTC which covers 08:00-21:00 CET (winter) and 09:00-21:00 CEST (summer)
    cron.schedule('*/10 7-19 * * *', async () => {
      try {
        await fetch(`${selfUrl}/api/health`);
      } catch {
        // Ignore - this is just a keep-alive
      }
    });
    console.log(`[KeepAlive] Self-ping during business hours (07-19 UTC = 08-21 NL time)`);
  }
}
