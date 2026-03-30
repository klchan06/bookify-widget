import type { Customer, Booking } from '@bookify/shared';
import apiClient from './client';

export const customersApi = {
  list: async (search?: string): Promise<Customer[]> => {
    const res = await apiClient.get('/customers', { params: { search } });
    return res.data.data;
  },

  get: async (id: string): Promise<Customer> => {
    const res = await apiClient.get(`/customers/${id}`);
    return res.data.data;
  },

  getBookings: async (id: string): Promise<Booking[]> => {
    const res = await apiClient.get(`/customers/${id}/bookings`);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    const res = await apiClient.put(`/customers/${id}`, data);
    return res.data.data;
  },

  search: async (query: string): Promise<Customer[]> => {
    const res = await apiClient.get('/customers/search', { params: { q: query } });
    return res.data.data;
  },
};
