import React, { useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { CalendarDays, TrendingUp, Users, Clock, Plus, Ban } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingScreen';
import { EmptyState } from '../components/EmptyState';
import { NewBookingModal } from './agenda/NewBookingModal';
import { useBookings, useBookingStats } from '../hooks/useBookings';

export function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: stats, isLoading: statsLoading } = useBookingStats();
  const { data: todayBookings, isLoading: bookingsLoading } = useBookings({ date: today });
  const [showNewBooking, setShowNewBooking] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewBooking(true)}>
            Nieuwe afspraak
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      {statsLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            title="Afspraken vandaag"
            value={stats?.todayCount ?? 0}
            icon={<CalendarDays className="w-6 h-6" />}
          />
          <Card
            title="Afspraken deze week"
            value={stats?.weekCount ?? 0}
            icon={<Clock className="w-6 h-6" />}
          />
          <Card
            title="Omzet deze maand"
            value={formatCurrency(stats?.monthRevenue ?? 0)}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <Card
            title="Klanten totaal"
            value={stats?.totalCustomers ?? 0}
            icon={<Users className="w-6 h-6" />}
          />
        </div>
      )}

      {/* Today's bookings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Afspraken vandaag</h2>
        {bookingsLoading ? (
          <LoadingSpinner />
        ) : !todayBookings?.length ? (
          <EmptyState
            title="Geen afspraken vandaag"
            description="Er zijn geen afspraken ingepland voor vandaag."
            icon={<Ban className="w-8 h-8" />}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {todayBookings
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 sm:gap-4 py-3 hover:bg-gray-50 active:bg-gray-100 rounded-lg px-2 -mx-2 min-h-[56px]"
                >
                  <div className="text-sm font-mono font-medium text-gray-900 w-20">
                    {booking.startTime} - {booking.endTime}
                  </div>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {booking.customer && (
                      <Avatar name={booking.customer.name} size="sm" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {booking.customer?.name || 'Onbekend'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {booking.service?.name}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block text-sm text-gray-500">
                    {booking.employee?.name}
                  </div>
                  <Badge status={booking.status} />
                </div>
              ))}
          </div>
        )}
      </div>

      <NewBookingModal
        isOpen={showNewBooking}
        onClose={() => setShowNewBooking(false)}
      />
    </div>
  );
}
