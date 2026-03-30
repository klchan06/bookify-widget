import type { CalendarConnection } from '@bookify/shared';
import apiClient from './client';

export const calendarApi = {
  getAuthUrl: async (): Promise<{ authUrl: string }> => {
    const res = await apiClient.get('/calendar/google/auth-url');
    return res.data.data;
  },

  disconnect: async (): Promise<void> => {
    await apiClient.delete('/calendar/google/disconnect');
  },

  sync: async (): Promise<void> => {
    await apiClient.post('/calendar/google/sync');
  },
};
