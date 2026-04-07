/**
 * Generate an .ics file content for a booking
 */
export function generateIcsFile(params: {
  title: string;
  description: string;
  location: string;
  date: string;      // "2026-04-01"
  startTime: string;  // "14:00"
  endTime: string;    // "14:30"
}): string {
  const { title, description, location, date, startTime, endTime } = params;

  const formatDateTime = (d: string, time: string): string => {
    const [year, month, day] = d.split('-');
    const [hour, minute] = time.split(':');
    return `${year}${month}${day}T${hour}${minute}00`;
  };

  const dtStart = formatDateTime(date, startTime);
  const dtEnd = formatDateTime(date, endTime);
  const now = new Date();
  const dtStamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `boekgerust-${Date.now()}-${Math.random().toString(36).slice(2)}@boekgerust.nl`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boekgerust//Widget//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcsFile(content: string, filename = 'afspraak.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
