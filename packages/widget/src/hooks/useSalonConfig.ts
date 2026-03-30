import { useState, useEffect } from 'react';
import type { Salon, SalonSettings } from '@bookify/shared';
import type { BookifyApiClient } from '../api/client';

interface SalonConfig {
  salon: Salon | null;
  settings: SalonSettings | null;
  loading: boolean;
  error: string | null;
}

export function useSalonConfig(apiClient: BookifyApiClient, salonId: string): SalonConfig {
  const [state, setState] = useState<SalonConfig>({
    salon: null,
    settings: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [salon, settings] = await Promise.all([
          apiClient.getSalon(salonId),
          apiClient.getSalonSettings(salonId),
        ]);
        if (mounted) {
          setState({ salon, settings, loading: false, error: null });
        }
      } catch (err) {
        if (mounted) {
          setState({
            salon: null,
            settings: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load salon',
          });
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [apiClient, salonId]);

  return state;
}
