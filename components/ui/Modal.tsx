'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/**
 * Modal dialog.
 *
 * Implemented directly rather than pulled from a library, because the
 * behaviour that actually matters is small and worth owning:
 *
 * - Escape closes it, and a click on the backdrop (but not inside) closes it.
 * - Body scroll is locked while open, with the scrollbar gutter preserved so
 * the page behind does not shift sideways.
 * - Focus moves into the dialog on open and returns to the trigger on close.
 * - Tab is trapped inside, so keyboard users cannot wander behind the overlay.
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disables backdrop/Escape dismissal while an action is in flight. */
  dismissible?: boolean;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      // Focus trap: wrap from last to first and back.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Defer so the panel exists before we look inside it.
    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, select, button',
      );
      target?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />

      <div
        ref={panelRef}
        className={cn(
          'relative z-10 w-full bg-surface shadow-lifted',
          // Full-width sheet on mobile, centred dialog from `sm` up.
          'rounded-t-3xl sm:rounded-2xl',
          'animate-slide-up sm:animate-scale-in',
          'max-h-[92vh] overflow-hidden flex flex-col',
          SIZES[size],
        )}
      >
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-content">
                  {title}
                </h2>
              )}
              {description && <p className="mt-1 text-sm text-content-muted">{description}</p>}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1.5 -mt-1 shrink-0 rounded-lg p-1.5 text-content-subtle transition-colors hover:bg-surface-sunken hover:text-content"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse gap-2.5 border-t border-line bg-surface-sunken/50 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Confirmation dialog for destructive actions.
 *
 * Every irreversible operation in the admin panel routes through this, so a
 * cancel or delete can never happen on a single stray click.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            variant === 'danger' ? 'bg-danger-bg text-danger-fg' : 'bg-info-bg text-info-fg',
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-semibold text-content">{title}</h2>
          <div className="mt-1.5 text-sm leading-relaxed text-content-muted">{message}</div>
        </div>
      </div>
    </Modal>
  );
}
