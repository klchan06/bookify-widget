import React, { useState, useMemo } from 'react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
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
import type { Booking } from '@bookify/shared';

type ViewMode = 'day' | 'week' | 'month';

export function AgendaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBookingDefaults, setNewBookingDefaults] = useState<{ date?: string; startTime?: string; employeeId?: string }>({});

  const { data: employees } = useEmployees();

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return {
          startDate: format(currentDate, 'yyyy-MM-dd'),
          endDate: format(currentDate, 'yyyy-MM-dd'),
        };
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
        };
      }
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(monthEnd, 'yyyy-MM-dd'),
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
        case 'day':
          return direction === 'next' ? addDays(prev, 1) : subDays(prev, 1);
        case 'week':
          return direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1);
        case 'month':
          return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
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
    setViewMode('day');
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE d MMMM yyyy', { locale: nl });
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(ws, 'd MMM', { locale: nl })} - ${format(we, 'd MMM yyyy', { locale: nl })}`;
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: nl });
    }
  };

  const employeeOptions = (employees || []).map((e) => ({ value: e.id, label: e.name }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Vandaag
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 ml-2 capitalize">
            {getTitle()}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Employee filter */}
          <div className="w-48">
            <Select
              options={employeeOptions}
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              placeholder="Alle medewerkers"
            />
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {mode === 'day' ? 'Dag' : mode === 'week' ? 'Week' : 'Maand'}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setNewBookingDefaults({});
              setShowNewBooking(true);
            }}
          >
            <span className="hidden sm:inline">Nieuwe afspraak</span>
          </Button>
        </div>
      </div>

      {/* Calendar view */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner className="py-20" />
        ) : viewMode === 'day' ? (
          <DayView
            date={currentDate}
            bookings={bookings || []}
            employees={selectedEmployeeId ? (employees || []).filter((e) => e.id === selectedEmployeeId) : employees || []}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        ) : viewMode === 'week' ? (
          <WeekView
            date={currentDate}
            bookings={bookings || []}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        ) : (
          <MonthView
            date={currentDate}
            bookings={bookings || []}
            onDayClick={handleDayClick}
          />
        )}
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
