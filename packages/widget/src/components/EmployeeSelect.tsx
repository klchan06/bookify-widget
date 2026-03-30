import React, { useEffect } from 'react';
import type { Employee } from '@bookify/shared';
import { t, type Locale } from '../i18n';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { useApi } from '../hooks/useApi';
import type { BookifyApiClient } from '../api/client';

interface EmployeeSelectProps {
  apiClient: BookifyApiClient;
  salonId: string;
  serviceId: string;
  locale: Locale;
  onSelect: (employee: Employee | null) => void;
  onSkip: () => void;
}

export const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  apiClient,
  salonId,
  serviceId,
  locale,
  onSelect,
  onSkip,
}) => {
  const { data: employees, loading, error, refetch } = useApi(
    () => apiClient.getEmployees(salonId, serviceId),
    [salonId, serviceId]
  );

  // Skip step if only 1 employee
  useEffect(() => {
    if (employees && employees.length === 1) {
      onSkip();
    }
  }, [employees, onSkip]);

  if (loading) return <LoadingSpinner locale={locale} />;
  if (error) return <ErrorMessage message={error} locale={locale} onRetry={refetch} />;
  if (!employees || employees.length === 0) {
    return <div className="bk-empty">{t('employee.noEmployees', locale)}</div>;
  }
  // Auto-skipped above if only 1 employee
  if (employees.length === 1) return <LoadingSpinner locale={locale} />;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div>
      <h2 className="bk-content__title">{t('employee.title', locale)}</h2>
      <div className="bk-employees">
        {/* No preference option */}
        <button
          className="bk-employee-card"
          onClick={() => onSelect(null)}
          aria-label={t('employee.noPreference', locale)}
        >
          <div className="bk-employee-card__avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="bk-employee-card__name">
              {t('employee.noPreference', locale)}
            </div>
            <div className="bk-employee-card__subtitle">
              {t('employee.noPreferenceDescription', locale)}
            </div>
          </div>
        </button>

        {/* Employee list */}
        {employees
          .filter((e) => e.isActive)
          .map((employee) => (
            <button
              key={employee.id}
              className="bk-employee-card"
              onClick={() => onSelect(employee)}
              aria-label={employee.name}
            >
              <div className="bk-employee-card__avatar">
                {employee.avatarUrl ? (
                  <img src={employee.avatarUrl} alt={employee.name} />
                ) : (
                  getInitials(employee.name)
                )}
              </div>
              <div>
                <div className="bk-employee-card__name">{employee.name}</div>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
};
