import type { CalendarConnection } from '@bookify/shared';
import apiClient from './client';

export const calendarApi = {
  getConnections: async (employeeId: string): Promise<CalendarConnection[]> => {
    const res = await apiClient.get(`/employees/${employeeId}/calendar`);
    return res.data.data;
  },

  connect: async (employeeId: string, provider: string): Promise<{ authUrl: string }> => {
    const res = await apiClient.post(`/employees/${employeeId}/calendar/connect`, { provider });
    return res.data.data;
  },

  disconnect: async (employeeId: string, connectionId: string): Promise<void> => {
    await apiClient.delete(`/employees/${employeeId}/calendar/${connectionId}`);
  },

  sync: async (employeeId: string, connectionId: string): Promise<void> => {
    await apiClient.post(`/employees/${employeeId}/calendar/${connectionId}/sync`);
  },
};
