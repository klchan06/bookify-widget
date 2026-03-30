export const nl = {
  // General
  'widget.title': 'Afspraak maken',
  'widget.loading': 'Laden...',
  'widget.error': 'Er is iets misgegaan',
  'widget.retry': 'Opnieuw proberen',
  'widget.back': 'Terug',
  'widget.next': 'Volgende',
  'widget.close': 'Sluiten',

  // Steps
  'step.service': 'Dienst',
  'step.employee': 'Medewerker',
  'step.datetime': 'Datum & Tijd',
  'step.details': 'Gegevens',
  'step.confirm': 'Bevestiging',

  // Service select
  'service.title': 'Kies een dienst',
  'service.duration': '{duration}',
  'service.noServices': 'Geen diensten beschikbaar',

  // Employee select
  'employee.title': 'Kies een medewerker',
  'employee.noPreference': 'Geen voorkeur',
  'employee.noPreferenceDescription': 'Eerste beschikbare medewerker',
  'employee.noEmployees': 'Geen medewerkers beschikbaar',

  // DateTime select
  'datetime.title': 'Kies datum en tijd',
  'datetime.selectDate': 'Selecteer een datum',
  'datetime.selectTime': 'Selecteer een tijd',
  'datetime.noSlots': 'Geen tijden beschikbaar op deze datum',
  'datetime.previousMonth': 'Vorige maand',
  'datetime.nextMonth': 'Volgende maand',

  // Customer form
  'form.title': 'Uw gegevens',
  'form.name': 'Naam',
  'form.namePlaceholder': 'Uw volledige naam',
  'form.email': 'E-mailadres',
  'form.emailPlaceholder': 'uw@email.nl',
  'form.phone': 'Telefoonnummer',
  'form.phonePlaceholder': '06-12345678',
  'form.notes': 'Opmerkingen',
  'form.notesPlaceholder': 'Eventuele opmerkingen...',
  'form.required': 'Verplicht veld',
  'form.invalidEmail': 'Ongeldig e-mailadres',
  'form.invalidPhone': 'Ongeldig telefoonnummer',

  // Confirmation
  'confirm.title': 'Bevestig uw afspraak',
  'confirm.service': 'Dienst',
  'confirm.employee': 'Medewerker',
  'confirm.date': 'Datum',
  'confirm.time': 'Tijd',
  'confirm.price': 'Prijs',
  'confirm.customer': 'Klant',
  'confirm.button': 'Afspraak bevestigen',
  'confirm.submitting': 'Bezig met boeken...',

  // Success
  'success.title': 'Afspraak bevestigd!',
  'success.message': 'Uw afspraak is succesvol geboekt. U ontvangt een bevestiging per e-mail.',
  'success.addToCalendar': 'Toevoegen aan agenda',
  'success.newBooking': 'Nieuwe afspraak maken',

  // Calendar days
  'day.mon': 'Ma',
  'day.tue': 'Di',
  'day.wed': 'Wo',
  'day.thu': 'Do',
  'day.fri': 'Vr',
  'day.sat': 'Za',
  'day.sun': 'Zo',

  // Months
  'month.0': 'Januari',
  'month.1': 'Februari',
  'month.2': 'Maart',
  'month.3': 'April',
  'month.4': 'Mei',
  'month.5': 'Juni',
  'month.6': 'Juli',
  'month.7': 'Augustus',
  'month.8': 'September',
  'month.9': 'Oktober',
  'month.10': 'November',
  'month.11': 'December',
} as const;

export type TranslationKey = keyof typeof nl;
