import React, { useEffect, useId, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@components/Icon';
import Button from '@components/Button';

interface DialogProps {
  title?: string;
  message?: string;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleConfirm?: () => void;
  handleClose?: () => void;
  handleClickBackdrop?: () => void;
  cancelButton?: boolean;
  children?: React.ReactElement;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const INTERACTIVE = 'a,button,select,textarea,[role="button"]';

const Dialog = ({
  title,
  message,
  setIsModalOpen,
  handleConfirm,
  handleClose,
  handleClickBackdrop,
  cancelButton = true,
  children,
}: DialogProps) => {
  const modalRoot = document.getElementById('modal-root');
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const _handleClose = () => {
    handleClose?.();
    setIsModalOpen(false);
  };

  const _handleBackdropClose = () => {
    if (handleClickBackdrop) handleClickBackdrop();
    else _handleClose();
  };

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      _handleBackdropClose();
      return;
    }
    if (event.key === 'Enter') {
      // Only treat Enter as "confirm" when it isn't already activating an
      // interactive element (button, link, select, textarea, role=button).
      if (handleConfirm && !(event.target as HTMLElement).closest(INTERACTIVE)) {
        handleConfirm();
      }
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;

    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[999] flex justify-center items-start pt-[5vh] px-4 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="relative z-10 max-w-2xl w-full flex justify-center">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative bg-[var(--bg-card)] rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-float)] w-full flex flex-col"
          style={{ maxHeight: '90vh' }}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)] rounded-t flex-shrink-0">
            <h3 id={titleId} className="ml-2 text-lg font-medium font-serif text-[var(--fg)]">
              {title ?? t('common.information')}
            </h3>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={_handleClose}
              className="text-[var(--fg-3)] hover:bg-[var(--bg-sand)] dark:hover:bg-[var(--fg-2)] hover:text-[var(--fg)] rounded-lg p-1.5 inline-flex items-center transition-colors cursor-pointer"
            >
              <Icon name="close" className="w-[16px] h-[16px]" />
            </button>
          </div>

          <div className="overflow-y-auto hide-scroll-bar flex-1 min-h-0 [&>*:last-child]:border-b-0">
            {message && (
              <div className="p-6 border-b border-[var(--border)]">
                <p className="text-[var(--fg-2)] text-sm">{message}</p>
              </div>
            )}
            {children}
          </div>

          {(handleConfirm || cancelButton) && (
            <div className="flex items-center justify-center p-6 gap-4 flex-shrink-0 border-t border-[var(--border)]">
              {handleConfirm && (
                <Button variant="primary" onClick={handleConfirm} aria-label="confirm">
                  {t('common.confirm')}
                </Button>
              )}
              {cancelButton && (
                <Button variant="neutral" onClick={_handleClose} aria-label="cancel">
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="bg-black/60 backdrop-blur-sm fixed inset-0 z-[-1]" onClick={_handleBackdropClose} />
    </div>,
    modalRoot
  );
};

export default Dialog;
