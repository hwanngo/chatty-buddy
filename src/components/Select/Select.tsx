import React, { useId } from 'react';
import Icon from '@components/Icon';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
}

const Select = ({ label, options, hint, error, className = '', id, ...props }: SelectProps) => {
  const reactId = useId();
  const selectId = id ?? reactId;
  const hintId = hint && !error ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-[var(--fg-2)]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`w-full px-3 py-2 pr-8 text-sm rounded-[var(--radius-field)] border bg-[var(--bg-card)] text-[var(--fg)] appearance-none
            transition-colors focus:outline-none focus:ring-2 focus:ring-[#3898ec]/25 focus:border-[#3898ec]
            disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
            ${error ? 'border-[var(--error)]' : 'border-[var(--border-mid)]'}
            ${className}`}
          {...props}
        >
          {options.map((opt, i) => (
            <option key={`${opt.value}-${i}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[var(--fg-3)]">
          <Icon name="chevronDown" className="w-[14px] h-[14px]" />
        </div>
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-[var(--fg-3)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-[var(--error)]">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
