import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, type BookingFilters, type CreateBookingData } from '../api/bookings';
import type { BookingStatus } from '@bookify/shared';
import toast from 'react-hot-toast';

export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => bookingsApi.list(filters),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: () => bookingsApi.get(id),
    enabled: !!id,
  });
}

export function useBookingStats() {
  return useQuery({
    queryKey: ['bookings', 'stats'],
    queryFn: bookingsApi.getStats,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingData) => bookingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Afspraak aangemaakt');
    },
    onError: () => toast.error('Fout bij aanmaken afspraak'),
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, cancelReason }: { id: string; status: BookingStatus; cancelReason?: string }) =>
      bookingsApi.updateStatus(id, status, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Status bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken status'),
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      bookingsApi.update(id, data as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Afspraak bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken afspraak'),
  });
}
