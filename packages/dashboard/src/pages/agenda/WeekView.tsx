import React from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Booking } from '@bookify/shared';
import { BOOKING_STATUSES } from '@bookify/shared';

interface WeekViewProps {
  date: Date;
  bookings: Booking[];
  onSlotClick: (date: string, time: string) => void;
  onBookingClick: (booking: Booking) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const SLOT_HEIGHT = 48;
const START_HOUR = 8;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function WeekView({ date, bookings, onSlotClick, onBookingClick }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-x-auto">
      {/* Day headers */}
      <div
        className="grid border-b border-gray-200 sticky top-0 bg-white z-10"
        style={{ gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: '700px' }}
      >
        <div className="p-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-l border-gray-200 ${isToday(day) ? 'bg-brand-50' : ''}`}
          >
            <div className="text-xs text-gray-500 uppercase">
              {format(day, 'EEE', { locale: nl })}
            </div>
            <div className={`text-lg font-semibold ${isToday(day) ? 'text-brand-600' : 'text-gray-900'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div
        className="grid relative"
        style={{ gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: '700px' }}
      >
        {/* Time labels */}
        <div>
          {HOURS.map((hour) => (
            <div key={hour} className="h-[48px] border-b border-gray-100 flex items-start justify-end pr-2">
              <span className="text-xs text-gray-400 -mt-2">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayBookings = bookings.filter((b) => b.date === dateStr);

          return (
            <div key={dateStr} className={`relative border-l border-gray-200 ${isToday(day) ? 'bg-brand-50/30' : ''}`}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[48px] border-b border-gray-100 cursor-pointer hover:bg-brand-50/50 transition-colors"
                  onClick={() => onSlotClick(dateStr, `${String(hour).padStart(2, '0')}:00`)}
                />
              ))}

              {dayBookings.map((booking) => {
                const startMinutes = timeToMinutes(booking.startTime) - START_HOUR * 60;
                const endMinutes = timeToMinutes(booking.endTime) - START_HOUR * 60;
                const top = (startMinutes / 60) * SLOT_HEIGHT;
                const height = ((endMinutes - startMinutes) / 60) * SLOT_HEIGHT;
                const statusColor = BOOKING_STATUSES[booking.status]?.color || '#3b82f6';

                return (
                  <div
                    key={booking.id}
                    className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 cursor-pointer text-white text-xs shadow-sm hover:shadow-md transition-shadow z-10 overflow-hidden"
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(height, 16)}px`,
                      backgroundColor: statusColor,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick(booking);
                    }}
                  >
                    <div className="font-medium truncate">
                      {booking.startTime} {booking.customer?.name || ''}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
