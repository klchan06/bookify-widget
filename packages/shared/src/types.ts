// ===== SALON / BUSINESS =====
export interface Salon {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalonSettings {
  salonId: string;
  bookingLeadTime: number;       // min hours before booking
  bookingWindow: number;         // max days ahead for booking
  cancellationWindow: number;    // hours before appointment for free cancel
  slotDuration: number;          // default slot duration in minutes
  allowEmployeeChoice: boolean;
  requirePhone: boolean;
  confirmationEmailEnabled: boolean;
  reminderEmailEnabled: boolean;
  reminderHoursBefore: number;
  widgetPrimaryColor: string;
  widgetAccentColor: string;
  widgetBorderRadius: number;
  widgetFontFamily: string;
}

// ===== EMPLOYEES =====
export interface Employee {
  id: string;
  salonId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: EmployeeRole;
  isActive: boolean;
  createdAt: string;
}

export type EmployeeRole = 'owner' | 'admin' | 'employee';

export interface WorkingHours {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  isWorking: boolean;
}

export interface EmployeeBreak {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SpecialDay {
  id: string;
  employeeId: string;
  date: string;        // "2026-04-01"
  isOff: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

// ===== SERVICES =====
export interface Service {
  id: string;
  salonId: string;
  name: string;
  description?: string;
  duration: number;      // in minutes
  price: number;         // in cents
  currency: string;
  category?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface EmployeeService {
  employeeId: string;
  serviceId: string;
}

// ===== BOOKINGS =====
export interface Booking {
  id: string;
  salonId: string;
  employeeId: string;
  serviceId: string;
  customerId: string;
  date: string;           // "2026-04-01"
  startTime: string;      // "14:00"
  endTime: string;        // "14:30"
  status: BookingStatus;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  // Recurring
  isRecurring?: boolean;
  recurringRule?: string;
  recurringGroupId?: string;
  // Notes
  privateNotes?: string;
  // Populated
  employee?: Employee;
  service?: Service;
  customer?: Customer;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'no_show'
  | 'completed';

// ===== CUSTOMERS =====
export interface Customer {
  id: string;
  salonId: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  totalBookings: number;
  lastVisit?: string;
  createdAt: string;
}

// ===== AVAILABILITY =====
export interface TimeSlot {
  time: string;        // "14:00"
  available: boolean;
  employeeId?: string;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

// ===== CALENDAR SYNC =====
export interface CalendarConnection {
  id: string;
  employeeId: string;
  provider: 'google' | 'outlook' | 'ical';
  externalCalendarId: string;
  syncEnabled: boolean;
  lastSynced?: string;
}

// ===== AUTH =====
export interface AuthUser {
  id: string;
  salonId: string;
  employeeId: string;
  email: string;
  role: EmployeeRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  salonName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ===== API RESPONSES =====
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===== WIDGET CONFIG =====
export interface WidgetConfig {
  salonId: string;
  apiUrl: string;
  primaryColor?: string;
  accentColor?: string;
  borderRadius?: number;
  fontFamily?: string;
  locale?: 'nl' | 'en';
  showPrices?: boolean;
  showDuration?: boolean;
}
