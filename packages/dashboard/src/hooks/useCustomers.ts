import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { customersApi } from '../api/customers';
import type { Customer } from '@bookify/shared';

export function useCustomers(search?: string, includeInactive?: boolean) {
  return useQuery({
    queryKey: ['customers', search, includeInactive],
    queryFn: () => customersApi.list(search, includeInactive),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  });
}

export function useCustomerBookings(id: string) {
  return useQuery({
    queryKey: ['customers', id, 'bookings'],
    queryFn: () => customersApi.getBookings(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Klant aangemaakt');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Fout bij aanmaken klant'),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Klant bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken klant'),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Klant gedeactiveerd');
    },
    onError: () => toast.error('Fout bij deactiveren klant'),
  });
}

export function useImportCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customers: Partial<Customer>[]) => customersApi.import(customers),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`${data.imported} geïmporteerd, ${data.updated} bijgewerkt, ${data.skipped} overgeslagen`);
    },
    onError: () => toast.error('Fout bij importeren'),
  });
}

export function useMergeCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keepId, mergeIds }: { keepId: string; mergeIds: string[] }) =>
      customersApi.merge(keepId, mergeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Klanten samengevoegd');
    },
    onError: () => toast.error('Fout bij samenvoegen'),
  });
}
