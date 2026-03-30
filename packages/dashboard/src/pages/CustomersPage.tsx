import React, { useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Search, UserCircle, Mail, Phone, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { LoadingSpinner } from '../components/LoadingScreen';
import { EmptyState } from '../components/EmptyState';
import { useCustomers, useCustomer, useCustomerBookings } from '../hooks/useCustomers';
import type { Customer } from '@bookify/shared';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: customers, isLoading } = useCustomers(search || undefined);

  if (selectedId) {
    return <CustomerDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  const columns = [
    {
      key: 'name',
      header: 'Naam',
      sortable: true,
      render: (c: Customer) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} size="sm" />
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'E-mail', sortable: true },
    { key: 'phone', header: 'Telefoon', render: (c: Customer) => c.phone || '-' },
    { key: 'totalBookings', header: 'Afspraken', sortable: true },
    {
      key: 'lastVisit',
      header: 'Laatste bezoek',
      sortable: true,
      render: (c: Customer) =>
        c.lastVisit ? format(new Date(c.lastVisit), 'd MMM yyyy', { locale: nl }) : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klanten</h1>
          <p className="text-gray-500 mt-1">
            {customers?.length ?? 0} klanten
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, e-mail of telefoon..."
          className="input-field pl-10"
        />
      </div>

      <div className="card p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : !customers?.length ? (
          <EmptyState
            title="Geen klanten gevonden"
            description={search ? 'Probeer een andere zoekterm.' : 'Klanten worden automatisch aangemaakt bij boekingen.'}
            icon={<UserCircle className="w-8 h-8" />}
          />
        ) : (
          <Table
            columns={columns}
            data={customers}
            keyExtractor={(c) => c.id}
            onRowClick={(c) => setSelectedId(c.id)}
          />
        )}
      </div>
    </div>
  );
}

function CustomerDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: customer, isLoading } = useCustomer(id);
  const { data: bookings, isLoading: bookingsLoading } = useCustomerBookings(id);

  if (isLoading) return <LoadingSpinner />;
  if (!customer) return <EmptyState title="Klant niet gevonden" />;

  const formatDate = (d: string) => format(new Date(d), 'd MMMM yyyy', { locale: nl });

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Terug naar klanten
      </button>

      <div className="card">
        <div className="flex items-start gap-4">
          <Avatar name={customer.name} size="lg" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" /> {customer.email}
              </span>
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {customer.phone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-gray-500">
                <strong className="text-gray-900">{customer.totalBookings}</strong> afspraken
              </span>
              {customer.lastVisit && (
                <span className="text-gray-500">
                  Laatste bezoek: <strong className="text-gray-900">{formatDate(customer.lastVisit)}</strong>
                </span>
              )}
            </div>
            {customer.notes && (
              <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">{customer.notes}</p>
            )}
          </div>
        </div>
      </div>

      {/* Booking history */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Afspraakgeschiedenis</h2>
        {bookingsLoading ? (
          <LoadingSpinner />
        ) : !bookings?.length ? (
          <EmptyState title="Geen afspraken" description="Deze klant heeft nog geen afspraken." />
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 py-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {format(new Date(booking.date + 'T00:00:00'), 'd MMM yyyy', { locale: nl })}
                    </p>
                    <p className="text-gray-500">{booking.startTime} - {booking.endTime}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {booking.service?.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {booking.employee?.name}
                    </p>
                  </div>
                  <Badge status={booking.status} />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
