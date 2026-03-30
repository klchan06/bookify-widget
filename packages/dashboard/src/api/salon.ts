import type { Salon, SalonSettings } from '@bookify/shared';
import apiClient from './client';

export const salonApi = {
  get: async (): Promise<Salon> => {
    const res = await apiClient.get('/salon/me');
    return res.data.data;
  },

  update: async (data: Partial<Salon>): Promise<Salon> => {
    const res = await apiClient.put('/salon', data);
    return res.data.data;
  },

  getSettings: async (): Promise<SalonSettings> => {
    const res = await apiClient.get('/salon/settings');
    return res.data.data;
  },

  updateSettings: async (data: Partial<SalonSettings>): Promise<SalonSettings> => {
    const res = await apiClient.put('/salon/settings', data);
    return res.data.data;
  },

  uploadLogo: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await apiClient.post('/salon/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};
