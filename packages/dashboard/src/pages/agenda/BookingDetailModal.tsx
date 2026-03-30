import React, { useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, User, Scissors, Calendar, MessageSquare, CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useUpdateBookingStatus } from '../../hooks/useBookings';
import type { Booking, BookingStatus } from '@bookify/shared';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

export function BookingDetailModal({ isOpen, onClose, booking }: BookingDetailModalProps) {
  const updateStatus = useUpdateBookingStatus();
  const [confirmAction, setConfirmAction] = useState<{ status: BookingStatus; label: string } | null>(null);

  const handleStatusChange = (status: BookingStatus) => {
    updateStatus.mutate(
      { id: booking.id, status },
      { onSuccess: () => { setConfirmAction(null); onClose(); } }
    );
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  const dateStr = booking.date
    ? format(new Date(booking.date + 'T00:00:00'), 'EEEE d MMMM yyyy', { locale: nl })
    : '';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Afspraakdetails" size="md">
        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Badge status={booking.status} />
            <span className="text-sm text-gray-500">#{booking.id.slice(0, 8)}</span>
          </div>

          {/* Date & time */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 capitalize">{dateStr}</p>
              <p className="text-sm text-gray-500">{booking.startTime} - {booking.endTime}</p>
            </div>
          </div>

          {/* Customer */}
          {booking.customer && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{booking.customer.name}</p>
                <p className="text-sm text-gray-500">{booking.customer.email}</p>
                {booking.customer.phone && (
                  <p className="text-sm text-gray-500">{booking.customer.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Service */}
          {booking.service && (
            <div className="flex items-start gap-3">
              <Scissors className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{booking.service.name}</p>
                <p className="text-sm text-gray-500">
                  {booking.service.duration} min - {formatPrice(booking.service.price)}
                </p>
              </div>
            </div>
          )}

          {/* Employee */}
          {booking.employee && (
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Avatar name={booking.employee.name} size="sm" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{booking.employee.name}</p>
                <p className="text-sm text-gray-500">{booking.employee.email}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
              <p className="text-sm text-gray-600">{booking.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-2">
            {booking.status === 'pending' && (
              <Button
                size="sm"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => setConfirmAction({ status: 'confirmed', label: 'Bevestigen' })}
              >
                Bevestigen
              </Button>
            )}
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<XCircle className="w-4 h-4" />}
                  onClick={() => setConfirmAction({ status: 'cancelled', label: 'Annuleren' })}
                >
                  Annuleren
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<AlertCircle className="w-4 h-4" />}
                  onClick={() => setConfirmAction({ status: 'no_show', label: 'Niet verschenen markeren' })}
                >
                  Niet verschenen
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Award className="w-4 h-4" />}
                  onClick={() => setConfirmAction({ status: 'completed', label: 'Afronden' })}
                >
                  Afgerond
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>

      {confirmAction && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => handleStatusChange(confirmAction.status)}
          title={confirmAction.label}
          message={`Weet je zeker dat je deze afspraak wilt ${confirmAction.label.toLowerCase()}?`}
          confirmLabel={confirmAction.label}
          variant={confirmAction.status === 'cancelled' ? 'danger' : 'primary'}
          loading={updateStatus.isPending}
        />
      )}
    </>
  );
}
