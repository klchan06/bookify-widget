import React, { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface ManageBookingProps {
  token: string;
  apiUrl: string;
}

interface BookingData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { id: string; name: string; duration: number; price: number; currency: string };
  employee: { id: string; name: string };
  salon: { id: string; name: string; address?: string; city?: string; phone?: string; email?: string };
  customer: { name: string; email: string; phone?: string };
}

type View = 'details' | 'cancel-confirm' | 'cancelled' | 'reschedule' | 'rescheduled' | 'error';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(cents / 100);
}

export function ManageBooking({ token, apiUrl }: ManageBookingProps) {
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('details');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/api/bookings/manage/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setBooking(data.data);
          if (window.location.hash === '#cancel') {
            setView('cancel-confirm');
          }
        } else {
          setError(data.error || 'Afspraak niet gevonden');
        }
      })
      .catch(() => setError('Er is iets misgegaan'))
      .finally(() => setLoading(false));
  }, [apiUrl, token]);

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/bookings/manage/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Geannuleerd door klant' }),
      });
      const data = await res.json();
      if (data.success) {
        setView('cancelled');
        setBooking(data.data);
      } else {
        setError(data.error || 'Fout bij annuleren');
        setView('error');
      }
    } catch {
      setError('Er is iets misgegaan');
      setView('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async (date: string, startTime: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/bookings/manage/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startTime }),
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
        setView('rescheduled');
      } else {
        setError(data.error || 'Fout bij wijzigen');
      }
    } catch {
      setError('Er is iets misgegaan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bookify-widget" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <LoadingSpinner locale="nl" />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="bookify-widget">
        <div className="bk-content">
          <ErrorMessage message={error} locale="nl" />
        </div>
      </div>
    );
  }

  if (!booking) return null;

  if (view === 'cancelled' || booking.status === 'cancelled') {
    return (
      <div className="bookify-widget">
        <div className="bk-content" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px',
          }}>✕</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>Afspraak geannuleerd</h2>
          <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
            Je afspraak voor <strong>{booking.service.name}</strong> op {formatDate(booking.date)} om {booking.startTime} is geannuleerd.
          </p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            Je ontvangt een bevestigingsmail van de annulering.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'cancel-confirm') {
    return (
      <div className="bookify-widget">
        <div className="bk-content">
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0' }}>Afspraak annuleren?</h2>
          <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
            Weet je zeker dat je deze afspraak wilt annuleren?
          </p>

          <BookingDetailsCard booking={booking} />

          {error && (
            <p style={{ color: '#dc2626', fontSize: '14px', margin: '16px 0', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              className="bk-btn"
              style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '1.5px solid #d2d2d7' }}
              onClick={() => { setView('details'); setError(null); }}
              disabled={submitting}
            >
              Terug
            </button>
            <button
              className="bk-btn"
              style={{ flex: 1, background: '#dc2626' }}
              onClick={handleCancel}
              disabled={submitting}
            >
              {submitting ? 'Bezig...' : 'Ja, annuleren'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'reschedule') {
    return (
      <RescheduleView
        booking={booking}
        apiUrl={apiUrl}
        onCancel={() => setView('details')}
        onSubmit={handleReschedule}
        submitting={submitting}
        error={error}
      />
    );
  }

  if (view === 'rescheduled') {
    return (
      <div className="bookify-widget">
        <div className="bk-content" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px',
          }}>✓</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>Afspraak gewijzigd</h2>
          <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
            Je nieuwe afspraak is bevestigd
          </p>
          <BookingDetailsCard booking={booking} />
        </div>
      </div>
    );
  }

  return (
    <div className="bookify-widget">
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        color: 'white',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 700 }}>Jouw afspraak</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: '14px' }}>{booking.salon.name}</p>
      </div>
      <div className="bk-content">
        <BookingDetailsCard booking={booking} />

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexDirection: 'column' }}>
          <button
            className="bk-btn"
            style={{ background: '#1a1a2e', width: '100%' }}
            onClick={() => setView('reschedule')}
          >
            Afspraak wijzigen
          </button>
          <button
            className="bk-btn"
            style={{ background: '#ffffff', color: '#dc2626', border: '1.5px solid #fee2e2', width: '100%' }}
            onClick={() => setView('cancel-confirm')}
          >
            Annuleren
          </button>
        </div>

        {(booking.salon.phone || booking.salon.email) && (
          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: '#f5f5f7',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#6b7280',
          }}>
            Contact {booking.salon.name}<br />
            {booking.salon.phone && <a href={`tel:${booking.salon.phone}`} style={{ color: '#6b7280' }}>{booking.salon.phone}</a>}
            {booking.salon.phone && booking.salon.email && ' · '}
            {booking.salon.email && <a href={`mailto:${booking.salon.email}`} style={{ color: '#6b7280' }}>{booking.salon.email}</a>}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingDetailsCard({ booking }: { booking: BookingData }) {
  return (
    <div style={{
      background: '#f5f5f7',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <DetailRow label="Dienst" value={booking.service.name} />
      <DetailRow label="Datum" value={formatDate(booking.date)} />
      <DetailRow label="Tijd" value={`${booking.startTime} - ${booking.endTime}`} />
      <DetailRow label="Medewerker" value={booking.employee.name} />
      {booking.salon.address && (
        <DetailRow label="Locatie" value={`${booking.salon.address}${booking.salon.city ? ', ' + booking.salon.city : ''}`} />
      )}
      <DetailRow label="Prijs" value={formatPrice(booking.service.price, booking.service.currency)} isLast />
    </div>
  );
}

function DetailRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div style={{
      padding: '12px 0',
      borderBottom: isLast ? 'none' : '1px solid #e5e5ea',
    }}>
      <p style={{ margin: 0, fontSize: '11px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: '#1d1d1f', fontWeight: 600 }}>{value}</p>
    </div>
  );
}

interface TimeSlot { time: string; available: boolean; }

function RescheduleView({ booking, apiUrl, onCancel, onSubmit, submitting, error }: {
  booking: BookingData;
  apiUrl: string;
  onCancel: () => void;
  onSubmit: (date: string, time: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [selectedDate, setSelectedDate] = useState<string>(booking.date);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime('');
    const params = new URLSearchParams({
      salonId: booking.salon.id,
      serviceId: booking.service.id,
      employeeId: booking.employee.id,
      date: selectedDate,
    });
    fetch(`${apiUrl}/api/availability?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSlots(data.data.slots || []);
        else setSlots([]);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, apiUrl, booking]);

  const dates = useMemo(() => {
    const arr: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const value = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
      arr.push({ value, label });
    }
    return arr;
  }, []);

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="bookify-widget">
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        color: 'white',
        padding: '24px',
      }}>
        <button
          onClick={onCancel}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '12px',
          }}
        >
          ← Terug
        </button>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 700 }}>Nieuwe datum kiezen</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: '14px' }}>{booking.service.name}</p>
      </div>
      <div className="bk-content">
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Kies een datum</p>
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}>
            {dates.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDate(d.value)}
                style={{
                  flexShrink: 0,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: selectedDate === d.value ? '2px solid #1a1a2e' : '1px solid #e5e5ea',
                  background: selectedDate === d.value ? '#1a1a2e' : '#ffffff',
                  color: selectedDate === d.value ? '#ffffff' : '#1d1d1f',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Kies een tijd</p>
          {loadingSlots ? (
            <p style={{ textAlign: 'center', color: '#9ca3af' }}>Laden...</p>
          ) : availableSlots.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>Geen beschikbare tijden op deze datum</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: selectedTime === slot.time ? '2px solid #1a1a2e' : '1px solid #e5e5ea',
                    background: selectedTime === slot.time ? '#1a1a2e' : '#ffffff',
                    color: selectedTime === slot.time ? '#ffffff' : '#1d1d1f',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
            {error}
          </p>
        )}

        <button
          className="bk-btn"
          style={{ background: '#1a1a2e', width: '100%' }}
          disabled={!selectedTime || submitting}
          onClick={() => onSubmit(selectedDate, selectedTime)}
        >
          {submitting ? 'Bezig...' : 'Bevestig wijziging'}
        </button>
      </div>
    </div>
  );
}
