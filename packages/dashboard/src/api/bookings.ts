import type { Booking, BookingStatus } from '@bookify/shared';
import apiClient from './client';

export interface BookingFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  status?: BookingStatus;
}

export interface CreateBookingData {
  salonId: string;
  serviceId: string;
  employeeId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  privateNotes?: string;
}

export const bookingsApi = {
  list: async (filters?: BookingFilters): Promise<Booking[]> => {
    const res = await apiClient.get('/bookings', { params: filters });
    return res.data.data;
  },

  get: async (id: string): Promise<Booking> => {
    const res = await apiClient.get(`/bookings/${id}`);
    return res.data.data;
  },

  create: async (data: CreateBookingData): Promise<Booking> => {
    const res = await apiClient.post('/bookings', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Booking>): Promise<Booking> => {
    const res = await apiClient.put(`/bookings/${id}`, data);
    return res.data.data;
  },

  updateStatus: async (id: string, status: BookingStatus, cancelReason?: string): Promise<Booking> => {
    const res = await apiClient.patch(`/bookings/${id}/status`, { status, cancelReason });
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bookings/${id}`);
  },

  createRecurring: async (data: CreateBookingData & {
    recurring: {
      frequency: string;
      days?: number[];
      endAfter?: number;
      endDate?: string;
    };
  }): Promise<Booking[]> => {
    const res = await apiClient.post('/bookings/recurring', data);
    return res.data.data;
  },

  getStats: async (): Promise<{
    todayCount: number;
    weekCount: number;
    monthRevenue: number;
    totalCustomers: number;
  }> => {
    const res = await apiClient.get('/bookings/stats');
    return res.data.data;
  },
};
