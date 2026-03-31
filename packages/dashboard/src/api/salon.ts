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

  getEmailTemplates: async (): Promise<any[]> => {
    const res = await apiClient.get('/salon/email-templates');
    return res.data.data;
  },

  updateEmailTemplate: async (type: string, data: { subject?: string; body?: string; isActive?: boolean }): Promise<any> => {
    const res = await apiClient.put(`/salon/email-templates/${type}`, data);
    return res.data.data;
  },

  previewEmailTemplate: async (type: string): Promise<{ subject: string; body: string }> => {
    const res = await apiClient.post(`/salon/email-templates/${type}/preview`);
    return res.data.data;
  },
};
