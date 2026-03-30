import React, { useState, useCallback, useEffect } from 'react';
import type { TimeSlot } from '@bookify/shared';
import { t, type Locale } from '../i18n';
import { LoadingSpinner } from './LoadingSpinner';
import { useAvailability } from '../hooks/useAvailability';
import type { BookifyApiClient } from '../api/client';

interface DateTimeSelectProps {
  apiClient: BookifyApiClient;
  salonId: string;
  serviceId: string;
  employeeId?: string;
  noPreference: boolean;
  locale: Locale;
  bookingWindow: number;
  onSelect: (date: string, time: string, employeeId?: string) => void;
}

const WEEKDAY_KEYS = [
  'day.mon',
  'day.tue',
  'day.wed',
  'day.thu',
  'day.fri',
  'day.sat',
  'day.sun',
] as const;

export const DateTimeSelect: React.FC<DateTimeSelectProps> = ({
  apiClient,
  salonId,
  serviceId,
  employeeId,
  noPreference,
  locale,
  bookingWindow,
  onSelect,
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const { availability, loading, fetchAvailability } = useAvailability(
    apiClient,
    salonId
  );

  // Fetch availability when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(serviceId, selectedDate, employeeId);
    }
  }, [selectedDate, serviceId, employeeId, fetchAvailability]);

  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleDateClick = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  }, []);

  const handleSlotClick = useCallback(
    (slot: TimeSlot) => {
      setSelectedSlot(slot);
      onSelect(selectedDate!, slot.time, slot.employeeId);
    },
    [selectedDate, onSelect]
  );

  // Calendar generation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // Convert to Monday-first (0=Mon, 6=Sun)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + bookingWindow);

  const isPrevDisabled =
    currentYear === today.getFullYear() && currentMonth <= today.getMonth();

  const monthKey = `month.${currentMonth}` as const;

  const availableSlots = availability?.slots.filter((s) => s.available) || [];

  return (
    <div>
      <h2 className="bk-content__title">{t('datetime.title', locale)}</h2>

      {/* Calendar */}
      <div className="bk-calendar">
        <div className="bk-calendar__header">
          <button
            className="bk-calendar__nav"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            aria-label={t('datetime.previousMonth', locale)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="bk-calendar__month">
            {t(monthKey as any, locale)} {currentYear}
          </span>
          <button
            className="bk-calendar__nav"
            onClick={handleNextMonth}
            aria-label={t('datetime.nextMonth', locale)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="bk-calendar__weekdays">
          {WEEKDAY_KEYS.map((key) => (
            <div key={key} className="bk-calendar__weekday">
              {t(key as any, locale)}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="bk-calendar__days">
          {/* Empty cells for offset */}
          {Array.from({ length: startOffset }, (_, i) => (
            <div key={`empty-${i}`} className="bk-calendar__day bk-calendar__day--empty" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const isToday =
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear();

            const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isTooFar = date > maxDate;
            const isDisabled = isPast || isTooFar;
            const isSelected = dateStr === selectedDate;

            let className = 'bk-calendar__day';
            if (isToday) className += ' bk-calendar__day--today';
            if (isSelected) className += ' bk-calendar__day--selected';
            if (isDisabled) className += ' bk-calendar__day--disabled';

            return (
              <button
                key={day}
                className={className}
                onClick={() => !isDisabled && handleDateClick(dateStr)}
                disabled={isDisabled}
                aria-label={`${day} ${t(monthKey as any, locale)}`}
                aria-pressed={isSelected}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <h3 className="bk-content__title" style={{ fontSize: 'var(--bk-font-size-base)' }}>
            {t('datetime.selectTime', locale)}
          </h3>

          {loading ? (
            <LoadingSpinner locale={locale} />
          ) : availableSlots.length === 0 ? (
            <div className="bk-empty">{t('datetime.noSlots', locale)}</div>
          ) : (
            <div className="bk-time-slots">
              {availableSlots.map((slot) => (
                <button
                  key={`${slot.time}-${slot.employeeId}`}
                  className={`bk-time-slot${selectedSlot?.time === slot.time && selectedSlot?.employeeId === slot.employeeId ? ' bk-time-slot--active' : ''}`}
                  onClick={() => handleSlotClick(slot)}
                  aria-label={slot.time}
                >
                  {slot.time}
                  {noPreference && slot.employeeId && (
                    <div className="bk-time-slot__employee">
                      {slot.employeeId}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
