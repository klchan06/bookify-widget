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

  create: async (data: Partial<Customer>): Promise<Customer> => {
    const res = await apiClient.post('/customers', data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  import: async (customers: Partial<Customer>[]): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    total: number;
    errors: string[];
  }> => {
    const res = await apiClient.post('/customers/import', { customers });
    return res.data.data;
  },

  export: async (): Promise<Customer[]> => {
    const res = await apiClient.get('/customers/export');
    return res.data.data;
  },

  merge: async (keepId: string, mergeIds: string[]): Promise<void> => {
    await apiClient.post('/customers/merge', { keepId, mergeIds });
  },

  search: async (query: string): Promise<Customer[]> => {
    const res = await apiClient.get('/customers/search', { params: { q: query } });
    return res.data.data;
  },
};
