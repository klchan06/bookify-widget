import React from 'react';
import type { Service } from '@bookify/shared';
import { formatPrice, formatDuration } from '@bookify/shared';
import { t, type Locale } from '../i18n';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { useApi } from '../hooks/useApi';
import type { BookifyApiClient } from '../api/client';

interface ServiceSelectProps {
  apiClient: BookifyApiClient;
  salonId: string;
  locale: Locale;
  showPrices: boolean;
  showDuration: boolean;
  onSelect: (service: Service) => void;
}

export const ServiceSelect: React.FC<ServiceSelectProps> = ({
  apiClient,
  salonId,
  locale,
  showPrices,
  showDuration,
  onSelect,
}) => {
  const { data: services, loading, error, refetch } = useApi(
    () => apiClient.getServices(salonId),
    [salonId]
  );

  if (loading) return <LoadingSpinner locale={locale} />;
  if (error) return <ErrorMessage message={error} locale={locale} onRetry={refetch} />;
  if (!services || services.length === 0) {
    return <div className="bk-empty">{t('service.noServices', locale)}</div>;
  }

  // Group by category
  const categories = new Map<string, Service[]>();
  const uncategorized: Service[] = [];

  for (const service of services.filter((s) => s.isActive)) {
    if (service.category) {
      const list = categories.get(service.category) || [];
      list.push(service);
      categories.set(service.category, list);
    } else {
      uncategorized.push(service);
    }
  }

  const renderServiceCard = (service: Service) => (
    <button
      key={service.id}
      className="bk-service-card"
      onClick={() => onSelect(service)}
      aria-label={`${service.name} - ${formatDuration(service.duration)} - ${formatPrice(service.price, service.currency)}`}
    >
      <div className="bk-service-card__info">
        <div className="bk-service-card__name">{service.name}</div>
        <div className="bk-service-card__meta">
          {showDuration && <span>{formatDuration(service.duration)}</span>}
          {service.description && (
            <span>{service.description}</span>
          )}
        </div>
      </div>
      {showPrices && (
        <div className="bk-service-card__price">
          {formatPrice(service.price, service.currency)}
        </div>
      )}
    </button>
  );

  return (
    <div>
      <h2 className="bk-content__title">{t('service.title', locale)}</h2>
      <div className="bk-services">
        {Array.from(categories.entries()).map(([category, categoryServices]) => (
          <div key={category} className="bk-category">
            <div className="bk-category__label">{category}</div>
            {categoryServices
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(renderServiceCard)}
          </div>
        ))}
        {uncategorized
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(renderServiceCard)}
      </div>
    </div>
  );
};
