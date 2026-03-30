import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { DatePicker } from '../../components/DatePicker';
import { useServices } from '../../hooks/useServices';
import { useEmployees } from '../../hooks/useEmployees';
import { useCreateBooking } from '../../hooks/useBookings';
import { availabilityApi } from '../../api/availability';
import { customersApi } from '../../api/customers';
import type { Customer, TimeSlot } from '@bookify/shared';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaults?: {
    date?: string;
    startTime?: string;
    employeeId?: string;
  };
}

export function NewBookingModal({ isOpen, onClose, defaults }: NewBookingModalProps) {
  const { data: services } = useServices();
  const { data: employees } = useEmployees();
  const createBooking = useCreateBooking();

  const [form, setForm] = useState({
    serviceId: '',
    employeeId: defaults?.employeeId || '',
    date: defaults?.date || format(new Date(), 'yyyy-MM-dd'),
    startTime: defaults?.startTime || '',
    customerSearch: '',
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        serviceId: '',
        employeeId: defaults?.employeeId || '',
        date: defaults?.date || format(new Date(), 'yyyy-MM-dd'),
        startTime: defaults?.startTime || '',
        customerSearch: '',
        customerId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        notes: '',
      });
      setSlots([]);
      setSearchResults([]);
      setShowNewCustomer(false);
      setErrors({});
    }
  }, [isOpen, defaults]);

  // Load available slots when service/employee/date change
  useEffect(() => {
    if (form.serviceId && form.date) {
      availabilityApi
        .getSlots({
          serviceId: form.serviceId,
          employeeId: form.employeeId || undefined,
          date: form.date,
        })
        .then((data) => setSlots(data.slots || []))
        .catch(() => setSlots([]));
    }
  }, [form.serviceId, form.employeeId, form.date]);

  // Search customers
  useEffect(() => {
    if (form.customerSearch.length >= 2) {
      customersApi
        .search(form.customerSearch)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    } else {
      setSearchResults([]);
    }
  }, [form.customerSearch]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const selectCustomer = (customer: Customer) => {
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerSearch: customer.name,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || '',
    }));
    setSearchResults([]);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.serviceId) errs.serviceId = 'Kies een dienst';
    if (!form.date) errs.date = 'Kies een datum';
    if (!form.startTime) errs.startTime = 'Kies een tijdslot';
    if (!form.customerId && !form.customerName) errs.customerName = 'Vul een klantnaam in';
    if (!form.customerId && !form.customerEmail) errs.customerEmail = 'Vul een e-mailadres in';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    createBooking.mutate(
      {
        serviceId: form.serviceId,
        employeeId: form.employeeId,
        customerId: form.customerId || undefined,
        date: form.date,
        startTime: form.startTime,
        customerName: !form.customerId ? form.customerName : undefined,
        customerEmail: !form.customerId ? form.customerEmail : undefined,
        customerPhone: !form.customerId ? form.customerPhone : undefined,
        notes: form.notes || undefined,
      },
      { onSuccess: onClose }
    );
  };

  const serviceOptions = (services || []).filter((s) => s.isActive).map((s) => ({
    value: s.id,
    label: `${s.name} (${s.duration} min - ${(s.price / 100).toFixed(2)})`,
  }));

  const employeeOptions = (employees || []).filter((e) => e.isActive).map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const availableSlots = slots.filter((s) => s.available);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nieuwe afspraak" size="lg">
      <div className="space-y-4">
        <Select
          label="Dienst"
          options={serviceOptions}
          value={form.serviceId}
          onChange={(e) => update('serviceId', e.target.value)}
          placeholder="Kies een dienst..."
          error={errors.serviceId}
        />

        <Select
          label="Medewerker"
          options={employeeOptions}
          value={form.employeeId}
          onChange={(e) => update('employeeId', e.target.value)}
          placeholder="Geen voorkeur"
        />

        <DatePicker
          label="Datum"
          value={form.date}
          onChange={(v) => update('date', v)}
          min={format(new Date(), 'yyyy-MM-dd')}
          error={errors.date}
        />

        {/* Time slots */}
        {form.serviceId && form.date && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Tijdslot</label>
            {availableSlots.length === 0 ? (
              <p className="text-sm text-gray-500">Geen beschikbare tijdsloten op deze datum.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => update('startTime', slot.time)}
                    className={`px-2 py-1.5 text-sm rounded-lg border transition-colors ${
                      form.startTime === slot.time
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
            {errors.startTime && <p className="text-sm text-red-600">{errors.startTime}</p>}
          </div>
        )}

        {/* Customer search */}
        <div className="space-y-2">
          <div className="relative">
            <Input
              label="Klant"
              value={form.customerSearch}
              onChange={(e) => {
                update('customerSearch', e.target.value);
                if (form.customerId) update('customerId', '');
              }}
              placeholder="Zoek bestaande klant..."
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    onClick={() => selectCustomer(c)}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-500 ml-2">{c.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!form.customerId && (
            <>
              <button
                type="button"
                onClick={() => setShowNewCustomer(!showNewCustomer)}
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                {showNewCustomer ? 'Verberg nieuwe klant formulier' : '+ Nieuwe klant toevoegen'}
              </button>

              {showNewCustomer && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <Input
                    label="Naam"
                    value={form.customerName}
                    onChange={(e) => update('customerName', e.target.value)}
                    placeholder="Volledige naam"
                    error={errors.customerName}
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => update('customerEmail', e.target.value)}
                    placeholder="naam@voorbeeld.nl"
                    error={errors.customerEmail}
                  />
                  <Input
                    label="Telefoon"
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => update('customerPhone', e.target.value)}
                    placeholder="06-12345678"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <Input
          label="Notities"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Optionele notities..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} loading={createBooking.isPending}>
            Opslaan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
