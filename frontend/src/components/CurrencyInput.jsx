import React, { useState, useEffect } from 'react';

const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export default function CurrencyInput({ value, onChange, onBlur, placeholder, className, required, ...props }) {
  const [displayValue, setDisplayValue] = useState('');

  // Sync incoming value to display text when it changes externally
  useEffect(() => {
    if (value === '' || value === null || value === undefined) {
      setDisplayValue('');
    } else {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        const currentNum = parseFloat(displayValue.replace(/,/g, ''));
        if (currentNum !== num) {
           setDisplayValue(fmt.format(num));
        }
      }
    }
  }, [value]);

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9.]/g, ''); // strip non-numeric
    
    // prevent multiple decimals
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }

    setDisplayValue(e.target.value); // Allow them to see what they type (like trailing dots)

    if (raw === '') {
      onChange('');
      return;
    }

    if (!raw.endsWith('.')) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = (e) => {
    if (value !== '' && value !== null) {
      setDisplayValue(fmt.format(parseFloat(value)));
    }
    if (onBlur) onBlur(e);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      required={required}
      {...props}
    />
  );
}
