import { prisma } from '../utils/prisma.js';
import type { TimeSlot } from '@bookify/shared';

interface AvailabilityParams {
  salonId: string;
  serviceId: string;
  employeeId?: string;
  date: string; // "YYYY-MM-DD"
  ignoreBookingWindow?: boolean;
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
  const bookingWindow = settings?.bookingWindow || 90;

  // Check booking window
  const targetDate = new Date(date + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.toISOString().split('T')[0] + 'T00:00:00');
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + bookingWindow);

  if (!params.ignoreBookingWindow && (targetDate > maxDate || targetDate < today)) return [];

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

  // Per-medewerker duur-overrides (null = basisduur van de dienst)
  const empServices = await prisma.employeeService.findMany({
    where: { serviceId, employeeId: { in: employeeIds } },
  });
  const durationByEmp = new Map(empServices.map((es) => [es.employeeId, es.duration]));

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

    // Effectieve duur voor deze medewerker (override of basisduur)
    const effectiveDuration = durationByEmp.get(empId) ?? service.duration;

    // Bouw bezette intervallen (bestaande afspraken + pauzes), gesorteerd op starttijd
    const busy = [
      ...existingBookings.map((b: { startTime: string; endTime: string }) => ({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
      })),
      ...breaks.map((b: { startTime: string; endTime: string }) => ({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
      })),
    ].sort((a, b) => a.start - b.start);

    const addSlot = (slotStart: number) => {
      const timeStr = minutesToTime(slotStart);
      const alreadyExists = allSlots.some((s) => s.time === timeStr && s.available);
      if (!alreadyExists) {
        allSlots.push({ time: timeStr, available: true, employeeId: empId });
      }
    };

    // Genereer slots PER VRIJ INTERVAL: begin direct na elke afspraak/pauze, met de
    // behandeltijd als stap. Zo sluiten de blokken aan op bestaande afspraken (geen
    // onnodige gaten) en past een langere dienst zodra er genoeg aaneengesloten ruimte is.
    const fillInterval = (from: number, until: number) => {
      const start = Math.max(from, leadTimeCutoffMinutes);
      for (let slotStart = start; slotStart + effectiveDuration <= until; slotStart += effectiveDuration) {
        addSlot(slotStart);
      }
    };
    let cursor = dayStart;
    for (const b of busy) {
      if (b.start > cursor) fillInterval(cursor, b.start);
      cursor = Math.max(cursor, b.end);
    }
    fillInterval(cursor, dayEnd);
  }

  // Sort by time
  allSlots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return allSlots;
}

interface AvailableDaysParams {
  salonId: string;
  serviceId: string;
  employeeId?: string;
  from: string; // "YYYY-MM-DD"
  to: string;   // "YYYY-MM-DD"
}

/**
 * Geeft de lijst datums (YYYY-MM-DD) in [from, to] waarop minstens één tijdslot
 * beschikbaar is. Gebruikt bulk-queries zodat een hele maand in enkele queries
 * berekend wordt (i.p.v. per dag een losse availability-call).
 */
export async function getAvailableDays(params: AvailableDaysParams): Promise<string[]> {
  const { salonId, serviceId, employeeId, from, to } = params;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return [];

  const settings = await prisma.salonSettings.findUnique({ where: { salonId } });
  const slotDuration = settings?.slotDuration || 15;
  const bookingLeadTime = settings?.bookingLeadTime || 2;
  const bookingWindow = settings?.bookingWindow || 90;

  // Bepaal welke medewerkers meetellen
  let employeeIds: string[];
  if (employeeId) {
    employeeIds = [employeeId];
  } else {
    const employeeServices = await prisma.employeeService.findMany({
      where: { serviceId },
      include: { employee: true },
    });
    employeeIds = employeeServices
      .filter((es) => es.employee.isActive && es.employee.salonId === salonId)
      .map((es) => es.employeeId);
  }
  if (employeeIds.length === 0) return [];

  // Per-medewerker duur-overrides (null = basisduur)
  const empServicesForDuration = await prisma.employeeService.findMany({
    where: { serviceId, employeeId: { in: employeeIds } },
  });
  const durationByEmp = new Map(empServicesForDuration.map((es) => [es.employeeId, es.duration]));

  // Bulk inladen voor het hele bereik
  const [workingHours, specialDays, breaks, bookings] = await Promise.all([
    prisma.workingHours.findMany({ where: { employeeId: { in: employeeIds } } }),
    prisma.specialDay.findMany({ where: { employeeId: { in: employeeIds }, date: { gte: from, lte: to } } }),
    prisma.employeeBreak.findMany({ where: { employeeId: { in: employeeIds } } }),
    prisma.booking.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: from, lte: to }, status: { notIn: ['cancelled'] } },
      select: { employeeId: true, date: true, startTime: true, endTime: true },
    }),
  ]);

  const whMap = new Map<string, typeof workingHours[number]>();
  workingHours.forEach((w) => whMap.set(`${w.employeeId}|${w.dayOfWeek}`, w));
  const sdMap = new Map<string, typeof specialDays[number]>();
  specialDays.forEach((s) => sdMap.set(`${s.employeeId}|${s.date}`, s));
  const brMap = new Map<string, typeof breaks>();
  breaks.forEach((b) => {
    const k = `${b.employeeId}|${b.dayOfWeek}`;
    if (!brMap.has(k)) brMap.set(k, []);
    brMap.get(k)!.push(b);
  });
  const bkMap = new Map<string, typeof bookings>();
  bookings.forEach((b) => {
    const k = `${b.employeeId}|${b.date}`;
    if (!bkMap.has(k)) bkMap.set(k, []);
    bkMap.get(k)!.push(b);
  });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const today = new Date(todayStr + 'T00:00:00');
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + bookingWindow);

  const result: string[] = [];
  const cursor = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');

  while (cursor <= end) {
    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const inWindow = cursor >= today && cursor <= maxDate;

    if (inWindow) {
      const dow = cursor.getDay();
      let hasSlot = false;

      for (const empId of employeeIds) {
        const sd = sdMap.get(`${empId}|${dateStr}`);
        if (sd?.isOff) continue;
        const wh = whMap.get(`${empId}|${dow}`);
        if (!wh || !wh.isWorking) continue;

        const dayStart = timeToMinutes(sd?.startTime || wh.startTime);
        const dayEnd = timeToMinutes(sd?.endTime || wh.endTime);
        const empBreaks = brMap.get(`${empId}|${dow}`) || [];
        const empBookings = bkMap.get(`${empId}|${dateStr}`) || [];

        let leadCutoff = 0;
        if (dateStr === todayStr) leadCutoff = now.getHours() * 60 + now.getMinutes() + bookingLeadTime * 60;

        const effDuration = durationByEmp.get(empId) ?? service.duration;
        // Zelfde vrije-interval-logica als getAvailableSlots: past de dienst in enig vrij gat?
        const busy = [
          ...empBookings.map((b) => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) })),
          ...empBreaks.map((b) => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) })),
        ].sort((a, b) => a.start - b.start);
        const fits = (from: number, until: number) => Math.max(from, leadCutoff) + effDuration <= until;
        let cursor = dayStart;
        for (const b of busy) {
          if (b.start > cursor && fits(cursor, b.start)) { hasSlot = true; break; }
          cursor = Math.max(cursor, b.end);
        }
        if (!hasSlot && fits(cursor, dayEnd)) hasSlot = true;
        if (hasSlot) break;
      }

      if (hasSlot) result.push(dateStr);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
