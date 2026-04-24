import React, { useEffect, useRef } from 'react';
import Icon from '@components/Icon';
import type { IconName } from '@components/Icon';
import useHideOnOutsideClick from '@hooks/useHideOnOutsideClick';
import { classNames } from '@utils/classNames';

interface MenuItem {
  label: string;
  onClick?: () => void;
  icon?: IconName;
  disabled?: boolean;
  danger?: boolean;
}

type MenuEntry = MenuItem | 'separator';

interface MenuProps {
  items: MenuEntry[];
  label?: string;
  ariaLabel?: string;
  align?: 'left' | 'right';
}

const isItem = (entry: MenuEntry): entry is MenuItem => entry !== 'separator';

/**
 * Accessible dropdown menu (ported from react-boilerplate's `Menu`, renamed to
 * `MenuKit` to avoid colliding with chatty's sidebar `Menu/`). Keyboard nav,
 * roving focus, token-driven styling.
 */
const MenuKit = ({ items, label, ariaLabel, align = 'left' }: MenuProps) => {
  const [open, setOpen, containerRef] = useHideOnOutsideClick();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const enabledIndexes = items.reduce<number[]>((acc, entry, i) => {
    if (isItem(entry) && !entry.disabled) acc.push(i);
    return acc;
  }, []);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const focusItem = (index: number) => {
    itemRefs.current[index]?.focus();
  };

  useEffect(() => {
    if (open && enabledIndexes.length > 0) {
      focusItem(enabledIndexes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleActivate = (item: MenuItem) => {
    if (item.disabled) return;
    item.onClick?.();
    close();
  };

  const moveFocus = (current: number, dir: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    const pos = enabledIndexes.indexOf(current);
    let nextPos: number;
    if (pos === -1) {
      nextPos = dir === 1 ? 0 : enabledIndexes.length - 1;
    } else {
      nextPos = (pos + dir + enabledIndexes.length) % enabledIndexes.length;
    }
    focusItem(enabledIndexes[nextPos]);
  };

  const handleMenuKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    index: number
  ) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(index, 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(index, -1);
        break;
      case 'Home':
        e.preventDefault();
        if (enabledIndexes.length) focusItem(enabledIndexes[0]);
        break;
      case 'End':
        e.preventDefault();
        if (enabledIndexes.length)
          focusItem(enabledIndexes[enabledIndexes.length - 1]);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          close();
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className='relative inline-block'>
      <button
        ref={triggerRef}
        type='button'
        aria-haspopup='menu'
        aria-expanded={open}
        aria-label={label ? undefined : ariaLabel}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKeyDown}
        className={classNames(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-field)] text-sm text-[var(--fg)]',
          'transition-colors cursor-pointer select-none',
          'hover:bg-[var(--bg-hover)]',
          'focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]',
          label
            ? 'px-3 py-2 border border-[var(--border)] bg-[var(--bg-card)]'
            : 'p-1.5'
        )}
      >
        {label ? (
          <>
            <span>{label}</span>
            <Icon
              name='chevronDown'
              className='w-[14px] h-[14px] text-[var(--fg-3)]'
            />
          </>
        ) : (
          <Icon
            name='moreVertical'
            className='w-[18px] h-[18px] text-[var(--fg-2)]'
          />
        )}
      </button>

      {open && (
        <div
          role='menu'
          aria-label={label ?? ariaLabel}
          className={classNames(
            'absolute z-50 top-full mt-1 min-w-44 p-1',
            'bg-[var(--bg-card)] border border-[var(--border)]',
            'rounded-[var(--radius-card)] shadow-[var(--shadow-float)]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((entry, i) => {
            if (!isItem(entry)) {
              return (
                <div
                  key={`sep-${i}`}
                  role='separator'
                  className='my-1 h-px bg-[var(--border)]'
                />
              );
            }
            return (
              <button
                key={`item-${i}`}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type='button'
                role='menuitem'
                tabIndex={-1}
                disabled={entry.disabled}
                onClick={() => handleActivate(entry)}
                onKeyDown={(e) => handleMenuKeyDown(e, i)}
                className={classNames(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                  'rounded-[var(--radius-field)] transition-colors cursor-pointer',
                  'focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  entry.danger ? 'text-[var(--error)]' : 'text-[var(--fg)]',
                  !entry.disabled && 'hover:bg-[var(--bg-hover)]'
                )}
              >
                {entry.icon && (
                  <Icon
                    name={entry.icon}
                    className={classNames(
                      'w-[16px] h-[16px]',
                      entry.danger ? 'text-[var(--error)]' : 'text-[var(--fg-3)]'
                    )}
                  />
                )}
                <span>{entry.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MenuKit;
