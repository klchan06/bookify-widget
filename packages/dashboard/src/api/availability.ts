import type { DayAvailability } from '@bookify/shared';
import apiClient from './client';

export const availabilityApi = {
  getSlots: async (params: {
    serviceId: string;
    employeeId?: string;
    date: string;
  }): Promise<DayAvailability> => {
    const res = await apiClient.get('/availability', { params });
    return res.data.data;
  },
};
