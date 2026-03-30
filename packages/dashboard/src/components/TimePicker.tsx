import React from 'react';

interface TimePickerProps {
  label?: string;
  value: string;
  onChange: (time: string) => void;
  error?: string;
  min?: string;
  max?: string;
}

export function TimePicker({ label, value, onChange, error, min, max }: TimePickerProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        type="time"
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
