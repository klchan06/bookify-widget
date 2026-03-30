import type { TimeSlot } from '@bookify/shared';
import apiClient from './client';

export const availabilityApi = {
  getSlots: async (params: {
    salonId: string;
    serviceId: string;
    date: string;
    employeeId?: string;
  }): Promise<{ date: string; slots: TimeSlot[] }> => {
    const res = await apiClient.get('/availability', { params });
    return res.data.data;
  },
};
