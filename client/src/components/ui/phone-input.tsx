import * as React from 'react';
import PhoneInputPrimitive, { type Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  defaultCountry?: Country;
}

export function PhoneInput({ value, onChange, className, placeholder, defaultCountry = 'SE' }: PhoneInputProps) {
  return (
    <div className={cn('phone-input-wrapper', className)}>
      <PhoneInputPrimitive
        international
        defaultCountry={defaultCountry}
        value={value}
        onChange={(val) => onChange(val || '')}
        placeholder={placeholder}
        numberInputProps={{
          className: cn(
            'flex h-10 w-full rounded-r-md border border-l-0 border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          ),
        }}
      />
    </div>
  );
}
