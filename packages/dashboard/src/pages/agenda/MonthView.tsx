import React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Booking } from '@bookify/shared';

interface MonthViewProps {
  date: Date;
  bookings: Booking[];
  onDayClick: (date: Date) => void;
}

export function MonthView({ date, bookings, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let current = calStart;
  while (current <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(current);
      current = addDays(current, 1);
    }
    weeks.push(week);
  }

  const getBookingCount = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return bookings.filter((b) => b.date === dateStr).length;
  };

  const dayLabels = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  return (
    <div>
      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayLabels.map((label) => (
          <div key={label} className="p-2 text-center text-xs font-medium text-gray-500 uppercase">
            {label}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
          {week.map((day) => {
            const count = getBookingCount(day);
            const inMonth = isSameMonth(day, date);
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[60px] sm:min-h-[80px] p-1.5 sm:p-2 border-r border-gray-100 last:border-r-0 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                  !inMonth ? 'bg-gray-50/50' : ''
                } ${today ? 'bg-brand-50/50' : ''}`}
                onClick={() => onDayClick(day)}
              >
                <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                  today
                    ? 'text-brand-600'
                    : inMonth
                    ? 'text-gray-900'
                    : 'text-gray-400'
                }`}>
                  {format(day, 'd')}
                </div>
                {count > 0 && (
                  <div className="text-[10px] sm:text-xs bg-brand-100 text-brand-700 rounded-full px-1.5 sm:px-2 py-0.5 inline-block font-medium">
                    <span className="hidden sm:inline">{count} {count === 1 ? 'afspraak' : 'afspraken'}</span>
                    <span className="sm:hidden">{count}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
