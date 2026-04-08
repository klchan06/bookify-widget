import React from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Booking } from '@bookify/shared';
import { getEmployeeColor } from '../../utils/employeeColor';

interface WeekViewProps {
  date: Date;
  bookings: Booking[];
  days?: number; // 4, 5, 6, or 7 (default 7)
  startFromDate?: boolean; // if true, start from `date` instead of Monday
  onSlotClick: (date: string, time: string, employeeId?: string) => void;
  onBookingClick: (booking: Booking) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 - 21:00
const SLOT_HEIGHT = 48;
const START_HOUR = 8;
const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Layout overlapping bookings side-by-side
// Returns each booking with its column index and total column count
function layoutBookings(bookings: Booking[]): Array<{ booking: Booking; col: number; cols: number }> {
  const sorted = [...bookings].sort((a, b) => {
    const t = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    return t !== 0 ? t : timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
  });

  // Group bookings into clusters of overlapping events
  const clusters: Booking[][] = [];
  for (const b of sorted) {
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    let placed = false;
    for (const cluster of clusters) {
      // Check if this booking overlaps with any in the cluster
      if (cluster.some((c) => {
        const cStart = timeToMinutes(c.startTime);
        const cEnd = timeToMinutes(c.endTime);
        return bStart < cEnd && bEnd > cStart;
      })) {
        cluster.push(b);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([b]);
  }

  // Within each cluster, assign each booking to the first available column
  const result: Array<{ booking: Booking; col: number; cols: number }> = [];
  for (const cluster of clusters) {
    const columns: Booking[][] = [];
    for (const b of cluster) {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1];
        if (timeToMinutes(last.endTime) <= bStart) {
          columns[i].push(b);
          result.push({ booking: b, col: i, cols: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([b]);
        result.push({ booking: b, col: columns.length - 1, cols: 0 });
      }
      // Check if any booking actually overlaps in time, not just shares a column
      const overlapping = cluster.filter((c) => {
        const cStart = timeToMinutes(c.startTime);
        const cEnd = timeToMinutes(c.endTime);
        return bStart < cEnd && bEnd > cStart;
      });
      // We'll fix cols below
      void overlapping;
    }
    // Set the cols for each booking to the max overlap count at its time
    for (const r of result.filter((r) => cluster.includes(r.booking))) {
      const rStart = timeToMinutes(r.booking.startTime);
      const rEnd = timeToMinutes(r.booking.endTime);
      const overlap = cluster.filter((c) => {
        const cStart = timeToMinutes(c.startTime);
        const cEnd = timeToMinutes(c.endTime);
        return rStart < cEnd && rEnd > cStart;
      }).length;
      r.cols = Math.max(columns.length, overlap);
    }
  }

  return result;
}

export function WeekView({ date, bookings, days: dayCount = 7, startFromDate = false, onSlotClick, onBookingClick }: WeekViewProps) {
  const start = startFromDate ? date : startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: dayCount }, (_, i) => addDays(start, i));
  const minWidth = dayCount <= 4 ? '500px' : '700px';

  return (
    <div className="overflow-x-auto">
      {/* Day headers */}
      <div
        className="grid border-b border-gray-200 sticky top-0 bg-white z-10"
        style={{ gridTemplateColumns: `60px repeat(${dayCount}, 1fr)`, minWidth }}
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
        style={{ gridTemplateColumns: `60px repeat(${dayCount}, 1fr)`, minWidth }}
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
              {HOURS.map((hour) => {
                const isUnavailable = hour < OPEN_HOUR || hour >= CLOSE_HOUR;
                return (
                  <div
                    key={hour}
                    className={`h-[48px] border-b border-gray-100 cursor-pointer hover:bg-brand-50/50 transition-colors ${
                      isUnavailable ? 'pointer-events-none' : ''
                    }`}
                    style={
                      isUnavailable
                        ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #f1f5f9 5px, #f1f5f9 10px)' }
                        : undefined
                    }
                    onClick={() => {
                      if (!isUnavailable) {
                        onSlotClick(dateStr, `${String(hour).padStart(2, '0')}:00`);
                      }
                    }}
                  />
                );
              })}

              {layoutBookings(dayBookings).map(({ booking, col, cols }) => {
                const startMinutes = timeToMinutes(booking.startTime) - START_HOUR * 60;
                const endMinutes = timeToMinutes(booking.endTime) - START_HOUR * 60;
                const top = (startMinutes / 60) * SLOT_HEIGHT;
                const height = ((endMinutes - startMinutes) / 60) * SLOT_HEIGHT;
                const employeeColor = getEmployeeColor(booking.employeeId);
                const isCancelled = booking.status === 'cancelled';

                // Side-by-side positioning for overlapping bookings
                const widthPct = 100 / cols;
                const leftPct = col * widthPct;

                return (
                  <div
                    key={booking.id}
                    className="absolute rounded px-1 py-0.5 cursor-pointer text-white text-xs shadow-sm hover:shadow-md transition-shadow z-10 overflow-hidden"
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(height, 16)}px`,
                      left: `calc(${leftPct}% + 1px)`,
                      width: `calc(${widthPct}% - 2px)`,
                      backgroundColor: employeeColor,
                      opacity: isCancelled ? 0.5 : 1,
                      textDecoration: isCancelled ? 'line-through' : 'none',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick(booking);
                    }}
                    title={`${booking.startTime} - ${booking.customer?.name || 'Klant'}${booking.employee?.name ? ' (' + booking.employee.name + ')' : ''}`}
                  >
                    <div className="font-medium truncate">
                      {booking.startTime} {booking.customer?.name || ''}
                    </div>
                    {booking.employee?.name && cols < 4 && (
                      <div className="truncate opacity-90 text-[10px]">
                        {booking.employee.name}
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
