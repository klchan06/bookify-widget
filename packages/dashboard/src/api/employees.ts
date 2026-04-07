import type { Employee, WorkingHours, EmployeeBreak, SpecialDay, EmployeeService } from '@bookify/shared';
import apiClient from './client';

export const employeesApi = {
  list: async (): Promise<Employee[]> => {
    const res = await apiClient.get('/employees', { params: { includeInactive: 'true' } });
    return res.data.data;
  },

  get: async (id: string): Promise<Employee> => {
    const res = await apiClient.get(`/employees/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Employee> & { password?: string }): Promise<Employee> => {
    const res = await apiClient.post('/employees', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Employee>): Promise<Employee> => {
    const res = await apiClient.put(`/employees/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/employees/${id}`);
  },

  // Working hours
  getWorkingHours: async (id: string): Promise<WorkingHours[]> => {
    const res = await apiClient.get(`/employees/${id}/working-hours`);
    return res.data.data;
  },

  updateWorkingHours: async (id: string, hours: Partial<WorkingHours>[]): Promise<WorkingHours[]> => {
    const res = await apiClient.put(`/employees/${id}/working-hours`, { hours });
    return res.data.data;
  },

  // Breaks
  getBreaks: async (id: string): Promise<EmployeeBreak[]> => {
    const res = await apiClient.get(`/employees/${id}/breaks`);
    return res.data.data;
  },

  updateBreaks: async (id: string, breaks: Partial<EmployeeBreak>[]): Promise<EmployeeBreak[]> => {
    const res = await apiClient.put(`/employees/${id}/breaks`, { breaks });
    return res.data.data;
  },

  // Special days
  getSpecialDays: async (id: string): Promise<SpecialDay[]> => {
    const res = await apiClient.get(`/employees/${id}/special-days`);
    return res.data.data;
  },

  addSpecialDay: async (id: string, data: Partial<SpecialDay>): Promise<SpecialDay> => {
    const res = await apiClient.post(`/employees/${id}/special-days`, data);
    return res.data.data;
  },

  deleteSpecialDay: async (id: string, dayId: string): Promise<void> => {
    await apiClient.delete(`/employees/${id}/special-days/${dayId}`);
  },

  // Services
  getServices: async (id: string): Promise<EmployeeService[]> => {
    const res = await apiClient.get(`/employees/${id}/services`);
    return res.data.data;
  },

  updateServices: async (id: string, serviceIds: string[]): Promise<void> => {
    await apiClient.put(`/employees/${id}/services`, { serviceIds });
  },
};
