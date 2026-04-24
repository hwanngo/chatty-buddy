import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Icon from '@components/Icon';
import useHideOnOutsideClick from '@hooks/useHideOnOutsideClick';
import { classNames } from '@utils/classNames';

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  emptyText?: string;
  id?: string;
  ariaLabel?: string;
}

const Combobox = ({
  options,
  value,
  onChange,
  label,
  placeholder,
  hint,
  error,
  disabled,
  emptyText = 'No results',
  id,
  ariaLabel,
}: ComboboxProps) => {
  const [open, setOpen, containerRef] = useHideOnOutsideClick();
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const reactId = useId();
  const baseId = id ?? reactId;
  const listboxId = `${baseId}-listbox`;
  const hintId = hint && !error ? `${baseId}-hint` : undefined;
  const errorId = error ? `${baseId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  // The text shown in the input: the live query while typing, otherwise the selected label.
  const displayText = typing ? query : (selected?.label ?? '');

  const filtered = useMemo(() => {
    if (!typing || query.trim() === '') return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, typing]);

  useEffect(() => {
    if (open) {
      const selIdx = filtered.findIndex((o) => o.value === value);
      setHighlightedIndex(selIdx >= 0 ? selIdx : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep highlight within bounds as the filtered list shrinks.
  useEffect(() => {
    setHighlightedIndex((i) => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const close = () => {
    setOpen(false);
    setTyping(false);
    setQuery('');
  };

  const handleSelect = (optValue: string) => {
    onChange?.(optValue);
    setTyping(false);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setHighlightedIndex((i) => Math.max(i - 1, 0));
        }
        break;
      case 'Enter': {
        if (open) {
          e.preventDefault();
          const opt = filtered[highlightedIndex];
          if (opt) handleSelect(opt.value);
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      {label && (
        <label htmlFor={baseId} className="text-xs font-medium text-[var(--fg-2)]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={baseId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={
            open && filtered.length > 0 ? `${baseId}-opt-${highlightedIndex}` : undefined
          }
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={displayText}
          onChange={(e) => {
            setQuery(e.target.value);
            setTyping(true);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={classNames(
            'w-full pl-3 pr-9 py-2 text-sm rounded-[var(--radius-field)] border bg-[var(--bg-card)] text-[var(--fg)] placeholder:text-[var(--fg-3)]',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus)]/25 focus:border-[var(--focus)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-[var(--error)]'
              : open
                ? 'border-[var(--focus)]'
                : 'border-[var(--border-mid)]'
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle options"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-[var(--fg-3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Icon
            name="chevronDown"
            className={classNames(
              'w-[14px] h-[14px] transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>

        {open && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel ?? label}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-mid)] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.08)] max-h-60 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-[var(--fg-3)]">{emptyText}</p>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isHighlighted = i === highlightedIndex;
                return (
                  <div
                    key={`${opt.value}-${i}`}
                    id={`${baseId}-opt-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      // Prevent input blur before the click registers.
                      e.preventDefault();
                    }}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={classNames(
                      'flex items-center justify-between gap-2 px-3 py-2.5 text-sm cursor-pointer transition-colors text-[var(--fg)]',
                      isHighlighted && 'bg-[var(--accent)]/10'
                    )}
                  >
                    <span className="min-w-0 truncate">{opt.label}</span>
                    {isSelected && (
                      <Icon
                        name="check"
                        className="w-[14px] h-[14px] text-[var(--accent-text)] flex-shrink-0"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
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

export default Combobox;
