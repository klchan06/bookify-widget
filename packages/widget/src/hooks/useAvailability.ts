import { useState, useCallback, useRef } from 'react';
import type { DayAvailability } from '@bookify/shared';
import type { BookifyApiClient } from '../api/client';

export function useAvailability(
  apiClient: BookifyApiClient,
  salonId: string
) {
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, DayAvailability>>({});

  const fetchAvailability = useCallback(
    async (serviceId: string, date: string, employeeId?: string) => {
      const cacheKey = `${serviceId}-${employeeId || 'any'}-${date}`;

      if (cache.current[cacheKey]) {
        setAvailability(cache.current[cacheKey]);
        return cache.current[cacheKey];
      }

      setLoading(true);
      setError(null);

      try {
        const data = await apiClient.getAvailability(
          salonId,
          serviceId,
          date,
          employeeId
        );
        cache.current[cacheKey] = data;
        setAvailability(data);
        setLoading(false);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load availability');
        setLoading(false);
        return null;
      }
    },
    [apiClient, salonId]
  );

  const clearCache = useCallback(() => {
    cache.current = {};
  }, []);

  return { availability, loading, error, fetchAvailability, clearCache };
}
