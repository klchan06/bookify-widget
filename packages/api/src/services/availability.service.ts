import { prisma } from '../utils/prisma.js';
import type { TimeSlot } from '@bookify/shared';

interface AvailabilityParams {
  salonId: string;
  serviceId: string;
  employeeId?: string;
  date: string; // "YYYY-MM-DD"
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function getAvailableSlots(params: AvailabilityParams): Promise<TimeSlot[]> {
  const { salonId, serviceId, employeeId, date } = params;

  // Get service for duration
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return [];

  // Get salon settings
  const settings = await prisma.salonSettings.findUnique({ where: { salonId } });
  const slotDuration = settings?.slotDuration || 15;
  const bookingLeadTime = settings?.bookingLeadTime || 2;
  const bookingWindow = settings?.bookingWindow || 30;

  // Check booking window
  const targetDate = new Date(date + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.toISOString().split('T')[0] + 'T00:00:00');
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + bookingWindow);

  if (targetDate > maxDate || targetDate < today) return [];

  // Get day of week (0=Sunday)
  const dayOfWeek = targetDate.getDay();

  // Build employee filter: either specific employee or all active employees for this service
  let employeeIds: string[];

  if (employeeId) {
    employeeIds = [employeeId];
  } else {
    const employeeServices = await prisma.employeeService.findMany({
      where: { serviceId },
      include: { employee: true },
    });
    employeeIds = employeeServices
      .filter((es: typeof employeeServices[number]) => es.employee.isActive && es.employee.salonId === salonId)
      .map((es: typeof employeeServices[number]) => es.employeeId);
  }

  if (employeeIds.length === 0) return [];

  const allSlots: TimeSlot[] = [];

  for (const empId of employeeIds) {
    // Check special days
    const specialDay = await prisma.specialDay.findUnique({
      where: { employeeId_date: { employeeId: empId, date } },
    });

    if (specialDay?.isOff) continue;

    // Get working hours for this day
    const workingHours = await prisma.workingHours.findUnique({
      where: { employeeId_dayOfWeek: { employeeId: empId, dayOfWeek } },
    });

    if (!workingHours || !workingHours.isWorking) continue;

    // Use special day hours if available, otherwise use regular working hours
    const startTime = specialDay?.startTime || workingHours.startTime;
    const endTime = specialDay?.endTime || workingHours.endTime;

    const dayStart = timeToMinutes(startTime);
    const dayEnd = timeToMinutes(endTime);

    // Get breaks for this day
    const breaks = await prisma.employeeBreak.findMany({
      where: { employeeId: empId, dayOfWeek },
    });

    // Get existing bookings for this employee on this date (non-cancelled)
    const existingBookings = await prisma.booking.findMany({
      where: {
        employeeId: empId,
        date,
        status: { notIn: ['cancelled'] },
      },
    });

    // Calculate lead time cutoff
    let leadTimeCutoffMinutes = 0;
    if (date === now.toISOString().split('T')[0]) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      leadTimeCutoffMinutes = currentMinutes + bookingLeadTime * 60;
    }

    // Generate slots
    for (let slotStart = dayStart; slotStart + service.duration <= dayEnd; slotStart += slotDuration) {
      const slotEnd = slotStart + service.duration;

      // Check lead time
      if (slotStart < leadTimeCutoffMinutes) continue;

      // Check if slot overlaps with any break
      const overlapsBreak = breaks.some((b: { startTime: string; endTime: string }) => {
        const breakStart = timeToMinutes(b.startTime);
        const breakEnd = timeToMinutes(b.endTime);
        return slotStart < breakEnd && slotEnd > breakStart;
      });
      if (overlapsBreak) continue;

      // Check if slot overlaps with any existing booking
      const overlapsBooking = existingBookings.some((b: { startTime: string; endTime: string }) => {
        const bookingStart = timeToMinutes(b.startTime);
        const bookingEnd = timeToMinutes(b.endTime);
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });
      if (overlapsBooking) continue;

      // Check if this slot time is already provided by another employee
      const timeStr = minutesToTime(slotStart);
      const alreadyExists = allSlots.some((s) => s.time === timeStr && s.available);

      if (!alreadyExists) {
        allSlots.push({
          time: timeStr,
          available: true,
          employeeId: empId,
        });
      }
    }
  }

  // Sort by time
  allSlots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return allSlots;
}
