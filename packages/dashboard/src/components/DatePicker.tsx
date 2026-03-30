import React from 'react';

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  error?: string;
}

export function DatePicker({ label, value, onChange, min, max, error }: DatePickerProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className={`input-field ${error ? 'border-red-500' : ''}`}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
