import React, { useState, useMemo } from 'react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isToday as isDateToday, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, CalendarPlus } from 'lucide-react';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { LoadingSpinner } from '../../components/LoadingScreen';
import { useBookings } from '../../hooks/useBookings';
import { useEmployees } from '../../hooks/useEmployees';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { BookingDetailModal } from './BookingDetailModal';
import { NewBookingModal } from './NewBookingModal';
import { getEmployeeColor } from '../../utils/employeeColor';
import type { Booking } from '@bookify/shared';

type ViewMode = 'resource' | 'day' | '4days' | 'week' | 'workweek' | 'worksat';

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  resource: 'Per resource',
  day: 'Dag',
  '4days': '4 dagen',
  week: 'Week',
  workweek: 'Ma-Vr',
  worksat: 'Ma-Za',
};

// --- MiniCalendar Component ---
function MiniCalendar({ selectedDate, onSelectDate }: { selectedDate: Date; onSelectDate: (date: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const dayLabels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900 capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: nl })}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((d) => {
            const inMonth = isSameMonth(d, viewMonth);
            const today = isDateToday(d);
            const selected = isSameDay(d, selectedDate);
            return (
              <button
                key={d.toISOString()}
                onClick={() => onSelectDate(d)}
                className={`text-xs w-7 h-7 flex items-center justify-center rounded-full transition-colors
                  ${!inMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}
                  ${today && !selected ? 'font-bold text-brand-600' : ''}
                  ${selected ? 'bg-brand-600 text-white hover:bg-brand-700' : ''}
                `}
              >
                {format(d, 'd')}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AgendaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('resource');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBookingDefaults, setNewBookingDefaults] = useState<{ date?: string; startTime?: string; employeeId?: string }>({});

  const { data: employees } = useEmployees();

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'resource':
      case 'day':
        return {
          startDate: format(currentDate, 'yyyy-MM-dd'),
          endDate: format(currentDate, 'yyyy-MM-dd'),
        };
      case '4days':
        return {
          startDate: format(currentDate, 'yyyy-MM-dd'),
          endDate: format(addDays(currentDate, 3), 'yyyy-MM-dd'),
        };
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
        };
      }
      case 'workweek': {
        const wwStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          startDate: format(wwStart, 'yyyy-MM-dd'),
          endDate: format(addDays(wwStart, 4), 'yyyy-MM-dd'),
        };
      }
      case 'worksat': {
        const wsStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          startDate: format(wsStart, 'yyyy-MM-dd'),
          endDate: format(addDays(wsStart, 5), 'yyyy-MM-dd'),
        };
      }
    }
  }, [viewMode, currentDate]);

  const { data: bookings, isLoading } = useBookings({
    ...dateRange,
    employeeId: selectedEmployeeId || undefined,
  });

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'resource':
        case 'day':
          return direction === 'next' ? addDays(prev, 1) : subDays(prev, 1);
        case '4days':
          return direction === 'next' ? addDays(prev, 4) : subDays(prev, 4);
        case 'week':
        case 'workweek':
        case 'worksat':
          return direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1);
      }
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleSlotClick = (date: string, time: string, employeeId?: string) => {
    setNewBookingDefaults({ date, startTime: time, employeeId });
    setShowNewBooking(true);
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('resource');
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'resource':
      case 'day':
        return format(currentDate, 'EEEE d MMMM yyyy', { locale: nl });
      case '4days': {
        const end4 = addDays(currentDate, 3);
        return `${format(currentDate, 'd MMM', { locale: nl })} - ${format(end4, 'd MMM yyyy', { locale: nl })}`;
      }
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(ws, 'd MMM', { locale: nl })} - ${format(we, 'd MMM yyyy', { locale: nl })}`;
      }
      case 'workweek': {
        const wwS = startOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(wwS, 'd MMM', { locale: nl })} - ${format(addDays(wwS, 4), 'd MMM yyyy', { locale: nl })}`;
      }
      case 'worksat': {
        const wsS = startOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(wsS, 'd MMM', { locale: nl })} - ${format(addDays(wsS, 5), 'd MMM yyyy', { locale: nl })}`;
      }
    }
  };

  const employeeOptions = (employees || []).map((e) => ({ value: e.id, label: e.name }));

  const viewModes: ViewMode[] = ['resource', 'day', '4days', 'week', 'workweek', 'worksat'];

  const renderCalendarView = () => {
    if (isLoading) {
      return <LoadingSpinner className="py-20" />;
    }

    switch (viewMode) {
      case 'resource':
        return (
          <DayView
            date={currentDate}
            bookings={bookings || []}
            employees={selectedEmployeeId ? (employees || []).filter((e) => e.id === selectedEmployeeId) : employees || []}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        );
      case 'day':
        return (
          <DayView
            date={currentDate}
            bookings={bookings || []}
            employees={selectedEmployeeId ? (employees || []).filter((e) => e.id === selectedEmployeeId) : []}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        );
      case '4days':
        return (
          <WeekView
            date={currentDate}
            bookings={bookings || []}
            days={4}
            startFromDate
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        );
      case 'week':
        return (
          <WeekView
            date={currentDate}
            bookings={bookings || []}
            days={7}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        );
      case 'workweek':
        return (
          <WeekView
            date={currentDate}
            bookings={bookings || []}
            days={5}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        );
      case 'worksat':
        return (
          <WeekView
            date={currentDate}
            bookings={bookings || []}
            days={6}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={() => navigate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Vandaag
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 ml-1 sm:ml-2 capitalize">
            {getTitle()}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Afspraak maken button - prominent */}
          <Button
            size="sm"
            icon={<CalendarPlus className="w-4 h-4" />}
            onClick={() => {
              setNewBookingDefaults({});
              setShowNewBooking(true);
            }}
          >
            <span className="hidden sm:inline">Afspraak maken</span>
            <span className="sm:hidden">Nieuw</span>
          </Button>

          {/* Employee filter */}
          <div className="w-full sm:w-48">
            <Select
              options={employeeOptions}
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              placeholder="Alle medewerkers"
            />
          </div>

          {/* View toggle - scrollable on mobile */}
          <div className="flex rounded-lg border border-gray-300 overflow-x-auto max-w-full">
            {viewModes.map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-2 text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap ${
                  viewMode === mode
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {VIEW_MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Employee color legend */}
      {(employees || []).filter((e) => e.isActive).length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs">
          {(employees || []).filter((e) => e.isActive).map((emp) => (
            <div key={emp.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getEmployeeColor(emp.id) }}
              />
              <span className="text-gray-700">{emp.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Layout: mini calendar + main view */}
      <div className="flex gap-4">
        {/* Mini calendar - desktop only */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <MiniCalendar
            selectedDate={currentDate}
            onSelectDate={(date) => setCurrentDate(date)}
          />
        </div>

        {/* Main calendar */}
        <div className="flex-1 card p-0 overflow-hidden">
          {renderCalendarView()}
        </div>
      </div>

      {/* Modals */}
      {selectedBooking && (
        <BookingDetailModal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          booking={selectedBooking}
        />
      )}

      <NewBookingModal
        isOpen={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        defaults={newBookingDefaults}
      />
    </div>
  );
}
