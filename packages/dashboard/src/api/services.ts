import type { Service } from '@bookify/shared';
import apiClient from './client';

export const servicesApi = {
  list: async (): Promise<Service[]> => {
    const res = await apiClient.get('/services');
    return res.data.data;
  },

  get: async (id: string): Promise<Service> => {
    const res = await apiClient.get(`/services/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Service>): Promise<Service> => {
    const res = await apiClient.post('/services', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Service>): Promise<Service> => {
    const res = await apiClient.put(`/services/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/${id}`);
  },

  reorder: async (ids: string[]): Promise<void> => {
    await apiClient.put('/services/reorder', { ids });
  },
};
