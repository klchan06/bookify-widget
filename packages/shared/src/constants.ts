export const DEFAULT_SLOT_DURATION = 15; // minutes
export const DEFAULT_BOOKING_LEAD_TIME = 2; // hours
export const DEFAULT_BOOKING_WINDOW = 30; // days
export const DEFAULT_CANCELLATION_WINDOW = 24; // hours
export const DEFAULT_REMINDER_HOURS = 24; // hours before appointment

export const DAYS_OF_WEEK = [
  'Zondag',
  'Maandag',
  'Dinsdag',
  'Woensdag',
  'Donderdag',
  'Vrijdag',
  'Zaterdag',
] as const;

export const DAYS_OF_WEEK_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const BOOKING_STATUSES = {
  pending: { label: 'In afwachting', color: '#f59e0b' },
  confirmed: { label: 'Bevestigd', color: '#10b981' },
  cancelled: { label: 'Geannuleerd', color: '#ef4444' },
  no_show: { label: 'Niet verschenen', color: '#6b7280' },
  completed: { label: 'Afgerond', color: '#3b82f6' },
} as const;

export const DEFAULT_WORKING_HOURS = {
  startTime: '09:00',
  endTime: '17:00',
} as const;

export const DEFAULT_WIDGET_THEME = {
  primaryColor: '#2563eb',
  accentColor: '#1d4ed8',
  borderRadius: 8,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;
