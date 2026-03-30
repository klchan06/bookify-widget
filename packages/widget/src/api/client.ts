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
    return this.request<Salon>(`/api/salons/${salonId}`);
  }

  async getSalonSettings(salonId: string): Promise<SalonSettings> {
    return this.request<SalonSettings>(`/api/salons/${salonId}/settings`);
  }

  async getServices(salonId: string): Promise<Service[]> {
    return this.request<Service[]>(`/api/salons/${salonId}/services`);
  }

  async getEmployees(salonId: string, serviceId?: string): Promise<Employee[]> {
    const query = serviceId ? `?serviceId=${serviceId}` : '';
    return this.request<Employee[]>(`/api/salons/${salonId}/employees${query}`);
  }

  async getAvailability(
    salonId: string,
    serviceId: string,
    date: string,
    employeeId?: string
  ): Promise<DayAvailability> {
    const params = new URLSearchParams({ serviceId, date });
    if (employeeId) params.set('employeeId', employeeId);
    return this.request<DayAvailability>(
      `/api/salons/${salonId}/availability?${params.toString()}`
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
    return this.request<Booking>(`/api/salons/${data.salonId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWidgetConfig(salonId: string): Promise<WidgetConfig> {
    return this.request<WidgetConfig>(`/api/salons/${salonId}/widget-config`);
  }
}
