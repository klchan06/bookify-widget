import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salonApi } from '../api/salon';
import type { Salon, SalonSettings } from '@bookify/shared';
import toast from 'react-hot-toast';

export function useSalon() {
  return useQuery({
    queryKey: ['salon'],
    queryFn: salonApi.get,
  });
}

export function useSalonSettings() {
  return useQuery({
    queryKey: ['salon', 'settings'],
    queryFn: salonApi.getSettings,
  });
}

export function useUpdateSalon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Salon>) => salonApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon'] });
      toast.success('Bedrijfsgegevens bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken bedrijfsgegevens'),
  });
}

export function useUpdateSalonSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SalonSettings>) => salonApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon', 'settings'] });
      toast.success('Instellingen bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken instellingen'),
  });
}
