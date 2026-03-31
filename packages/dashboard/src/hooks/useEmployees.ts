import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../api/employees';
import type { Employee, WorkingHours, EmployeeBreak, SpecialDay } from '@bookify/shared';
import toast from 'react-hot-toast';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.list,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Employee> & { password?: string }) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Medewerker aangemaakt');
    },
    onError: () => toast.error('Fout bij aanmaken medewerker'),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Medewerker bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken medewerker'),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Medewerker verwijderd');
    },
    onError: () => toast.error('Fout bij verwijderen medewerker'),
  });
}

export function useWorkingHours(employeeId: string) {
  return useQuery({
    queryKey: ['employees', employeeId, 'working-hours'],
    queryFn: () => employeesApi.getWorkingHours(employeeId),
    enabled: !!employeeId,
  });
}

export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: Partial<WorkingHours>[] }) =>
      employeesApi.updateWorkingHours(id, hours),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees', id, 'working-hours'] });
      toast.success('Werkuren bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken werkuren'),
  });
}

export function useEmployeeBreaks(employeeId: string) {
  return useQuery({
    queryKey: ['employees', employeeId, 'breaks'],
    queryFn: () => employeesApi.getBreaks(employeeId),
    enabled: !!employeeId,
  });
}

export function useEmployeeSpecialDays(employeeId: string) {
  return useQuery({
    queryKey: ['employees', employeeId, 'special-days'],
    queryFn: () => employeesApi.getSpecialDays(employeeId),
    enabled: !!employeeId,
  });
}

export function useAddSpecialDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SpecialDay> }) =>
      employeesApi.addSpecialDay(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees', id, 'special-days'] });
      toast.success('Vrije dag toegevoegd');
    },
    onError: () => toast.error('Fout bij toevoegen vrije dag'),
  });
}

export function useDeleteSpecialDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, dayId }: { employeeId: string; dayId: string }) =>
      employeesApi.deleteSpecialDay(employeeId, dayId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'special-days'] });
      toast.success('Vrije dag verwijderd');
    },
    onError: () => toast.error('Fout bij verwijderen vrije dag'),
  });
}

export function useEmployeeServices(employeeId: string) {
  return useQuery({
    queryKey: ['employees', employeeId, 'services'],
    queryFn: () => employeesApi.getServices(employeeId),
    enabled: !!employeeId,
  });
}
