import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../api/customers';

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list(search),
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
