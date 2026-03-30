import type { TranslationKey } from './nl';

export const en: Record<TranslationKey, string> = {
  // General
  'widget.title': 'Book an appointment',
  'widget.loading': 'Loading...',
  'widget.error': 'Something went wrong',
  'widget.retry': 'Try again',
  'widget.back': 'Back',
  'widget.next': 'Next',
  'widget.close': 'Close',

  // Steps
  'step.service': 'Service',
  'step.employee': 'Employee',
  'step.datetime': 'Date & Time',
  'step.details': 'Details',
  'step.confirm': 'Confirmation',

  // Service select
  'service.title': 'Choose a service',
  'service.duration': '{duration}',
  'service.noServices': 'No services available',

  // Employee select
  'employee.title': 'Choose an employee',
  'employee.noPreference': 'No preference',
  'employee.noPreferenceDescription': 'First available employee',
  'employee.noEmployees': 'No employees available',

  // DateTime select
  'datetime.title': 'Choose date and time',
  'datetime.selectDate': 'Select a date',
  'datetime.selectTime': 'Select a time',
  'datetime.noSlots': 'No times available on this date',
  'datetime.previousMonth': 'Previous month',
  'datetime.nextMonth': 'Next month',

  // Customer form
  'form.title': 'Your details',
  'form.name': 'Name',
  'form.namePlaceholder': 'Your full name',
  'form.email': 'Email address',
  'form.emailPlaceholder': 'your@email.com',
  'form.phone': 'Phone number',
  'form.phonePlaceholder': '06-12345678',
  'form.notes': 'Notes',
  'form.notesPlaceholder': 'Any additional notes...',
  'form.required': 'Required field',
  'form.invalidEmail': 'Invalid email address',
  'form.invalidPhone': 'Invalid phone number',

  // Confirmation
  'confirm.title': 'Confirm your appointment',
  'confirm.service': 'Service',
  'confirm.employee': 'Employee',
  'confirm.date': 'Date',
  'confirm.time': 'Time',
  'confirm.price': 'Price',
  'confirm.customer': 'Customer',
  'confirm.button': 'Confirm appointment',
  'confirm.submitting': 'Booking...',

  // Success
  'success.title': 'Appointment confirmed!',
  'success.message': 'Your appointment has been booked successfully. You will receive a confirmation email.',
  'success.addToCalendar': 'Add to calendar',
  'success.newBooking': 'Book another appointment',

  // Calendar days
  'day.mon': 'Mo',
  'day.tue': 'Tu',
  'day.wed': 'We',
  'day.thu': 'Th',
  'day.fri': 'Fr',
  'day.sat': 'Sa',
  'day.sun': 'Su',

  // Months
  'month.0': 'January',
  'month.1': 'February',
  'month.2': 'March',
  'month.3': 'April',
  'month.4': 'May',
  'month.5': 'June',
  'month.6': 'July',
  'month.7': 'August',
  'month.8': 'September',
  'month.9': 'October',
  'month.10': 'November',
  'month.11': 'December',
};
