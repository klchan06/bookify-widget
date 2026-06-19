import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { LoadingSpinner } from './LoadingScreen';
import {
  useEmployeeServicePricing,
  useSetEmployeeServicePrice,
} from '../hooks/useEmployees';

interface Props {
  employeeId: string;
  employeeName: string;
}

interface RowEdit {
  price: string;
  duration: string;
}

export function EmployeePricingPanel({ employeeId, employeeName }: Props) {
  const { data: rows, isLoading } = useEmployeeServicePricing(employeeId);
  const setPrice = useSetEmployeeServicePrice(employeeId);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  if (isLoading) return <LoadingSpinner />;
  if (!rows?.length) {
    return <div className="text-center py-12 text-gray-500 text-sm">Geen actieve diensten.</div>;
  }

  const editOf = (serviceId: string): RowEdit => {
    if (edits[serviceId]) return edits[serviceId];
    const r = rows.find((x) => x.serviceId === serviceId)!;
    return {
      price: r.price != null ? (r.price / 100).toFixed(2) : '',
      duration: r.duration != null ? String(r.duration) : '',
    };
  };

  const setField = (serviceId: string, field: keyof RowEdit, value: string) => {
    setEdits((prev) => ({ ...prev, [serviceId]: { ...editOf(serviceId), [field]: value } }));
  };

  const saveRow = (serviceId: string) => {
    const e = editOf(serviceId);
    const price = e.price.trim() === '' ? null : Math.round(Number(e.price.replace(',', '.')) * 100);
    const duration = e.duration.trim() === '' ? null : Math.round(Number(e.duration));
    if (price != null && (isNaN(price) || price < 0)) return;
    if (duration != null && (isNaN(duration) || duration <= 0)) return;

    const r = rows.find((x) => x.serviceId === serviceId)!;
    // Alleen opslaan als er iets veranderd is
    if (price === (r.price ?? null) && duration === (r.duration ?? null)) return;

    setPrice.mutate(
      { serviceId, price, duration },
      {
        onSuccess: () => {
          setSavedId(serviceId);
          setTimeout(() => setSavedId((cur) => (cur === serviceId ? null : cur)), 1500);
        },
      }
    );
  };

  return (
    <div>
      <p className="px-4 py-3 text-sm text-gray-500">
        Prijs en duur voor <span className="font-medium text-gray-700">{employeeName}</span>. Laat een
        veld leeg om de <span className="font-medium">standaardwaarde</span> te gebruiken.
      </p>

      {/* Kop (desktop) */}
      <div className="hidden sm:grid grid-cols-[1fr_130px_130px_28px] gap-3 px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
        <span>Dienst</span>
        <span>Prijs (€)</span>
        <span>Duur (min)</span>
        <span></span>
      </div>

      <div className="divide-y divide-gray-100">
        {rows.map((r) => {
          const e = editOf(r.serviceId);
          const usingBasePrice = e.price.trim() === '';
          const usingBaseDuration = e.duration.trim() === '';
          return (
            <div
              key={r.serviceId}
              className="grid grid-cols-2 sm:grid-cols-[1fr_130px_130px_28px] gap-x-3 gap-y-2 px-4 py-3 items-center"
            >
              <div className="col-span-2 sm:col-span-1 font-medium text-gray-900">{r.name}</div>

              <label className="flex flex-col gap-1 sm:contents">
                <span className="text-xs text-gray-400 sm:hidden">Prijs (€)</span>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.50"
                    value={e.price}
                    placeholder={(r.basePrice / 100).toFixed(2)}
                    onChange={(ev) => setField(r.serviceId, 'price', ev.target.value)}
                    onBlur={() => saveRow(r.serviceId)}
                    className={`input-field w-full ${usingBasePrice ? 'text-gray-400' : ''}`}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1 sm:contents">
                <span className="text-xs text-gray-400 sm:hidden">Duur (min)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="5"
                  step="5"
                  value={e.duration}
                  placeholder={String(r.baseDuration)}
                  onChange={(ev) => setField(r.serviceId, 'duration', ev.target.value)}
                  onBlur={() => saveRow(r.serviceId)}
                  className={`input-field w-full ${usingBaseDuration ? 'text-gray-400' : ''}`}
                />
              </label>

              <div className="hidden sm:flex justify-center">
                {savedId === r.serviceId && <Check className="w-4 h-4 text-green-600" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
