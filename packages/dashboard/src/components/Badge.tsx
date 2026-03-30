import React from 'react';
import { BOOKING_STATUSES } from '@bookify/shared';
import type { BookingStatus } from '@bookify/shared';

interface BadgeProps {
  status: BookingStatus;
}

const statusStyles: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
  completed: 'bg-blue-100 text-blue-800',
};

export function Badge({ status }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {BOOKING_STATUSES[status].label}
    </span>
  );
}
