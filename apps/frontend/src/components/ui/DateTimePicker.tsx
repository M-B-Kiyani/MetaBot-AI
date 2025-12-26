import React from 'react';
import { Input } from './Input';

interface DateTimePickerProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string;
  onChange?: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  error,
  helperText,
  value,
  onChange,
  minDate,
  maxDate,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  // Set default min date to today
  const defaultMinDate = minDate || new Date().toISOString().slice(0, 16);

  return (
    <Input
      type="datetime-local"
      label={label}
      error={error}
      helperText={helperText}
      value={value}
      onChange={handleChange}
      min={defaultMinDate}
      max={maxDate}
      className={className}
    />
  );
};
