import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Booking, Employee } from '@bookify/shared';
import { BOOKING_STATUSES } from '@bookify/shared';

interface DayViewProps {
  date: Date;
  bookings: Booking[];
  employees: Employee[];
  onSlotClick: (date: string, time: string, employeeId?: string) => void;
  onBookingClick: (booking: Booking) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 - 21:00

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export function DayView({ date, bookings, employees, onSlotClick, onBookingClick }: DayViewProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayBookings = bookings.filter((b) => b.date === dateStr);
  const showEmployees = employees.length > 0;
  const cols = showEmployees ? employees : [{ id: 'all', name: 'Alle' }];
  const SLOT_HEIGHT = 60; // px per hour
  const START_HOUR = 8;
  const isMobile = useIsMobile();
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(cols[0]?.id || 'all');

  // Reset active employee when employees change
  useEffect(() => {
    if (cols.length > 0 && !cols.find((c) => c.id === activeEmployeeId)) {
      setActiveEmployeeId(cols[0].id);
    }
  }, [cols, activeEmployeeId]);

  const getBookingsForColumn = (colId: string) => {
    if (colId === 'all') return dayBookings;
    return dayBookings.filter((b) => b.employeeId === colId);
  };

  // Mobile: card-based list view with employee tabs
  if (isMobile) {
    const mobileBookings = showEmployees && employees.length > 1
      ? getBookingsForColumn(activeEmployeeId)
      : dayBookings;

    const sortedBookings = [...mobileBookings].sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div>
        {/* Employee tab bar (horizontal scroll) */}
        {showEmployees && employees.length > 1 && (
          <div className="overflow-x-auto border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex min-w-max">
              {cols.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setActiveEmployeeId(col.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-[48px] ${
                    activeEmployeeId === col.id
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Booking cards */}
        <div className="divide-y divide-gray-100">
          {sortedBookings.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Geen afspraken
            </div>
          ) : (
            sortedBookings.map((booking) => {
              const statusColor = BOOKING_STATUSES[booking.status]?.color || '#3b82f6';
              return (
                <button
                  key={booking.id}
                  className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[56px]"
                  onClick={() => onBookingClick(booking)}
                >
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 font-mono">
                        {booking.startTime} - {booking.endTime}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: statusColor }}
                      >
                        {BOOKING_STATUSES[booking.status]?.label || booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 truncate">{booking.customer?.name || 'Klant'}</p>
                    <p className="text-xs text-gray-500 truncate">{booking.service?.name}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Quick add button area */}
        <button
          className="w-full py-3 text-sm text-brand-600 font-medium hover:bg-brand-50 transition-colors border-t border-gray-200"
          onClick={() => onSlotClick(dateStr, '09:00', activeEmployeeId !== 'all' ? activeEmployeeId : undefined)}
        >
          + Afspraak toevoegen
        </button>
      </div>
    );
  }

  // Desktop: original grid view
  return (
    <div className="overflow-x-auto">
      {/* Employee headers */}
      {showEmployees && employees.length > 1 && (
        <div
          className="grid border-b border-gray-200 sticky top-0 bg-white z-10"
          style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)` }}
        >
          <div className="p-2" />
          {cols.map((col) => (
            <div key={col.id} className="p-3 text-center text-sm font-medium text-gray-700 border-l border-gray-200">
              {col.name}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div
        className="grid relative"
        style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)` }}
      >
        {/* Time labels */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-[60px] border-b border-gray-100 flex items-start justify-end pr-2 pt-0"
            >
              <span className="text-xs text-gray-400 -mt-2">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Columns */}
        {cols.map((col) => {
          const colBookings = getBookingsForColumn(col.id);
          return (
            <div key={col.id} className="relative border-l border-gray-200">
              {/* Hour rows (clickable) */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[60px] border-b border-gray-100 cursor-pointer hover:bg-brand-50/50 transition-colors"
                  onClick={() =>
                    onSlotClick(
                      dateStr,
                      `${String(hour).padStart(2, '0')}:00`,
                      col.id !== 'all' ? col.id : undefined
                    )
                  }
                >
                  {/* Half-hour line */}
                  <div className="h-1/2 border-b border-gray-50" />
                </div>
              ))}

              {/* Booking blocks */}
              {colBookings.map((booking) => {
                const startMinutes = timeToMinutes(booking.startTime) - START_HOUR * 60;
                const endMinutes = timeToMinutes(booking.endTime) - START_HOUR * 60;
                const top = (startMinutes / 60) * SLOT_HEIGHT;
                const height = ((endMinutes - startMinutes) / 60) * SLOT_HEIGHT;

                const statusColor = BOOKING_STATUSES[booking.status]?.color || '#3b82f6';

                return (
                  <div
                    key={booking.id}
                    className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer overflow-hidden text-white text-xs shadow-sm hover:shadow-md transition-shadow z-10"
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(height, 20)}px`,
                      backgroundColor: statusColor,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick(booking);
                    }}
                  >
                    <div className="font-medium truncate">
                      {booking.startTime} - {booking.customer?.name || 'Klant'}
                    </div>
                    {height > 30 && (
                      <div className="truncate opacity-90">
                        {booking.service?.name}
                      </div>
                    )}
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
