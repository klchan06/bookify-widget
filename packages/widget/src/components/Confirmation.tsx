import React, { useState, useCallback } from 'react';
import type { Service, Employee, Booking } from '@bookify/shared';
import { formatPrice, formatDuration } from '@bookify/shared';
import { t, type Locale } from '../i18n';
import { formatDateLong, addMinutesToTime } from '../utils/formatters';
import { generateIcsFile, downloadIcsFile } from '../utils/calendar';
import type { CustomerData } from '../hooks/useBooking';
import type { BookifyApiClient } from '../api/client';

interface ConfirmationProps {
  apiClient: BookifyApiClient;
  salonId: string;
  salonName: string;
  salonAddress: string;
  service: Service;
  employee: Employee | null;
  date: string;
  time: string;
  employeeId: string | null;
  customerData: CustomerData;
  locale: Locale;
  onSuccess: (booking: Booking) => void;
  onNewBooking: () => void;
}

export const Confirmation: React.FC<ConfirmationProps> = ({
  apiClient,
  salonId,
  salonName,
  salonAddress,
  service,
  employee,
  date,
  time,
  employeeId,
  customerData,
  locale,
  onSuccess,
  onNewBooking,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const endTime = addMinutesToTime(time, service.duration);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.createBooking({
        salonId,
        serviceId: service.id,
        employeeId: employeeId || undefined,
        date,
        startTime: time,
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerPhone: customerData.phone || undefined,
        notes: customerData.notes || undefined,
      });
      setBooking(result);
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('widget.error', locale));
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, salonId, service, employeeId, date, time, customerData, locale, onSuccess]);

  const handleAddToCalendar = useCallback(() => {
    const ics = generateIcsFile({
      title: `${service.name} - ${salonName}`,
      description: `Afspraak bij ${salonName}: ${service.name}`,
      location: salonAddress,
      date,
      startTime: time,
      endTime,
    });
    downloadIcsFile(ics);
  }, [service, salonName, salonAddress, date, time, endTime]);

  // Success screen
  if (booking) {
    return (
      <div className="bk-success">
        <div className="bk-success__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="bk-success__title">{t('success.title', locale)}</h2>
        <p className="bk-success__message">{t('success.message', locale)}</p>

        <div className="bk-summary">
          <div className="bk-summary__row">
            <span className="bk-summary__label">{t('confirm.service', locale)}</span>
            <span className="bk-summary__value">{service.name}</span>
          </div>
          <div className="bk-summary__row">
            <span className="bk-summary__label">{t('confirm.date', locale)}</span>
            <span className="bk-summary__value">{formatDateLong(date, locale)}</span>
          </div>
          <div className="bk-summary__row">
            <span className="bk-summary__label">{t('confirm.time', locale)}</span>
            <span className="bk-summary__value">{time} - {endTime}</span>
          </div>
        </div>

        <div className="bk-success__actions">
          <button className="bk-btn bk-btn--primary" onClick={handleAddToCalendar}>
            {t('success.addToCalendar', locale)}
          </button>
          <button className="bk-btn bk-btn--secondary" onClick={onNewBooking}>
            {t('success.newBooking', locale)}
          </button>
        </div>
      </div>
    );
  }

  // Confirmation summary
  return (
    <div>
      <h2 className="bk-content__title">{t('confirm.title', locale)}</h2>

      <div className="bk-summary">
        <div className="bk-summary__row">
          <span className="bk-summary__label">{t('confirm.service', locale)}</span>
          <span className="bk-summary__value">
            {service.name} ({formatDuration(service.duration)})
          </span>
        </div>
        {employee && (
          <div className="bk-summary__row">
            <span className="bk-summary__label">{t('confirm.employee', locale)}</span>
            <span className="bk-summary__value">{employee.name}</span>
          </div>
        )}
        <div className="bk-summary__row">
          <span className="bk-summary__label">{t('confirm.date', locale)}</span>
          <span className="bk-summary__value">{formatDateLong(date, locale)}</span>
        </div>
        <div className="bk-summary__row">
          <span className="bk-summary__label">{t('confirm.time', locale)}</span>
          <span className="bk-summary__value">{time} - {endTime}</span>
        </div>
        <div className="bk-summary__row">
          <span className="bk-summary__label">{t('confirm.price', locale)}</span>
          <span className="bk-summary__value">
            {formatPrice(service.price, service.currency)}
          </span>
        </div>
        <div className="bk-summary__row">
          <span className="bk-summary__label">{t('confirm.customer', locale)}</span>
          <span className="bk-summary__value">
            {customerData.name}
            <br />
            <span style={{ fontSize: 'var(--bk-font-size-sm)', color: 'var(--bk-text-secondary)' }}>
              {customerData.email}
            </span>
          </span>
        </div>
      </div>

      {error && (
        <div className="bk-error" role="alert">
          <p className="bk-error__message">{error}</p>
        </div>
      )}

      <button
        className="bk-btn bk-btn--primary"
        onClick={handleConfirm}
        disabled={submitting}
      >
        {submitting ? t('confirm.submitting', locale) : t('confirm.button', locale)}
      </button>
    </div>
  );
};
