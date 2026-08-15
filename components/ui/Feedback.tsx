import type { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/**
 * Loading, empty and error states.
 *
 * Collected here because these three are the states most often skipped, and
 * skipping them is what makes an interface feel unfinished. Having them as
 * components means using one is easier than not.
 */

export function Badge({
  children,
  className,
  dot,
}: {
  children: ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} aria-hidden />}
      {children}
    </span>
  );
}

/** Shimmering placeholder. Match its shape to the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

/** Skeleton shaped like the slot grid, so the layout does not jump on load. */
export function SlotGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 16 }).map((_, index) => (
        <Skeleton key={index} className="h-[52px] rounded-xl" />
      ))}
    </div>
  );
}

export function AppointmentListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2.5 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-4', columnIndex === 0 ? 'w-1/4' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state.
 *
 * Always offers a next step where one exists — an empty list with a way
 * forward is helpful, one without is a dead end.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-sunken/40 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-content-subtle shadow-sm">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-content">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-content-muted text-pretty">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * Error state with a retry.
 *
 * The message shown is the one the API supplied, which is written for patients;
 * internal detail never reaches this component.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-danger-border bg-danger-bg/40 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg text-danger-fg">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-content">{title}</h3>
      {message && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-content-muted text-pretty">
          {message}
        </p>
      )}
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-6"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline error, for use inside a form or card. */
export function InlineError({ message, className }: { message: string; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="leading-snug">{message}</span>
    </div>
  );
}

/** Centred spinner for a full-page or full-panel load. */
export function LoadingSpinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-14', className)}>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600"
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <p className="text-sm text-content-muted">{label}</p>}
    </div>
  );
}
