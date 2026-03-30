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
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            salonName: booking.salon.name,
            salonEmail: booking.salon.email,
            employeeName: booking.employee.name,
            serviceName: booking.service.name,
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
}
