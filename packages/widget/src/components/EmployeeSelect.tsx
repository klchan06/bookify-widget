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
  locale: Locale;
  onSelect: (employee: Employee | null) => void;
}

export const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  apiClient,
  salonId,
  locale,
  onSelect,
}) => {
  const { data: employees, loading, error, refetch } = useApi(
    () => apiClient.getEmployees(salonId),
    [salonId]
  );

  // Eén medewerker? Sla de stap over en kies 'm automatisch
  const activeEmployees = (employees || []).filter((e) => e.isActive);
  useEffect(() => {
    if (employees && activeEmployees.length === 1) {
      onSelect(activeEmployees[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  if (loading) return <LoadingSpinner locale={locale} />;
  if (error) return <ErrorMessage message={error} locale={locale} onRetry={refetch} />;
  if (activeEmployees.length === 0) {
    return <div className="bk-empty">{t('employee.noEmployees', locale)}</div>;
  }
  // Auto-selected above if only 1 employee
  if (activeEmployees.length === 1) return <LoadingSpinner locale={locale} />;

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
        {/* Employee list */}
        {activeEmployees
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
