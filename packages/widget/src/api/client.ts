import type {
  ApiResponse,
  Salon,
  SalonSettings,
  Service,
  Employee,
  DayAvailability,
  Booking,
  WidgetConfig,
} from '@bookify/shared';

export class BookifyApiClient {
  private baseUrl: string;

  constructor(apiUrl: string) {
    this.baseUrl = apiUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    const json: ApiResponse<T> = await response.json();
    if (!json.success) {
      throw new Error(json.error || 'Unknown error');
    }

    return json.data as T;
  }

  async getSalon(salonId: string): Promise<Salon> {
    return this.request<Salon>(`/api/salon?id=${salonId}`);
  }

  async getSalonSettings(salonId: string): Promise<SalonSettings> {
    // Widget-config endpoint is public and returns settings
    const config = await this.request<WidgetConfig & Partial<SalonSettings>>(
      `/api/salon/widget-config/${salonId}`
    );
    return {
      salonId,
      bookingLeadTime: 2,
      bookingWindow: 30,
      cancellationWindow: 24,
      slotDuration: 15,
      allowEmployeeChoice: (config as any).allowEmployeeChoice ?? true,
      requirePhone: (config as any).requirePhone ?? true,
      confirmationEmailEnabled: true,
      reminderEmailEnabled: true,
      reminderHoursBefore: 24,
      widgetPrimaryColor: config.primaryColor || '#2563eb',
      widgetAccentColor: config.accentColor || '#1d4ed8',
      widgetBorderRadius: config.borderRadius || 8,
      widgetFontFamily: config.fontFamily || 'Inter, sans-serif',
    };
  }

  async getServices(salonId: string): Promise<Service[]> {
    return this.request<Service[]>(`/api/services?salonId=${salonId}`);
  }

  async getEmployees(salonId: string, serviceId?: string): Promise<Employee[]> {
    const params = new URLSearchParams({ salonId });
    if (serviceId) params.set('serviceId', serviceId);
    return this.request<Employee[]>(`/api/employees?${params.toString()}`);
  }

  async getAvailability(
    salonId: string,
    serviceId: string,
    date: string,
    employeeId?: string
  ): Promise<DayAvailability> {
    const params = new URLSearchParams({ salonId, serviceId, date });
    if (employeeId) params.set('employeeId', employeeId);
    return this.request<DayAvailability>(
      `/api/availability?${params.toString()}`
    );
  }

  async createBooking(data: {
    salonId: string;
    serviceId: string;
    employeeId?: string;
    date: string;
    startTime: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    notes?: string;
  }): Promise<Booking> {
    return this.request<Booking>(`/api/bookings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWidgetConfig(salonId: string): Promise<WidgetConfig> {
    return this.request<WidgetConfig>(`/api/salon/widget-config/${salonId}`);
  }
}
