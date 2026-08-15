'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast notifications.
 *
 * Every action with a server round trip reports its outcome here, so the user
 * is never left wondering whether something happened. Toasts stack, auto-dismiss
 * on a timer proportional to how much there is to read, and can be dismissed
 * early.
 *
 * Rendered inside an `aria-live` region so the outcome is announced rather than
 * only shown.
 */

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (input: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
};

const STYLES: Record<ToastVariant, string> = {
  success: 'border-success-border bg-success-bg text-success-fg',
  error: 'border-danger-border bg-danger-bg text-danger-fg',
  info: 'border-info-border bg-info-bg text-info-fg',
  warning: 'border-warning-border bg-warning-bg text-warning-fg',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Cap the stack so a burst of failures cannot fill the screen.
    setToasts((current) => [...current.slice(-2), { ...input, id }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ variant: 'success', title, description }),
      error: (title, description) => toast({ variant: 'error', title, description }),
      info: (title, description) => toast({ variant: 'info', title, description }),
      warning: (title, description) => toast({ variant: 'warning', title, description }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        /*
 Bottom-right on desktop, raised 6rem so the stack clears the floating
 chat launcher. Top-right would sit directly over the page action bars
          (Refresh / Export / New booking on the dashboard), and a toast that
 covers a button the user is reaching for is worse than one they have
 to glance down at.
        */
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2.5 p-4 sm:inset-x-auto sm:bottom-24 sm:right-0 sm:items-end sm:p-6"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    // Longer for errors and for anything with a description — there is more to
    // read, and a failure deserves the extra beat.
    const duration = toast.variant === 'error' ? 7000 : toast.description ? 5500 : 4000;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lifted',
        'animate-fade-up',
        STYLES[toast.variant],
      )}
    >
      <span className="mt-0.5 shrink-0">{ICONS[toast.variant]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm leading-snug opacity-90">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
