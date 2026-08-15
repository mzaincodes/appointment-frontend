import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Card.
 *
 * Elevation is expressed with a border plus a layered shadow rather than a
 * heavy drop shadow. In dark mode the border does most of the work — shadows
 * are nearly invisible against a dark ground, so a card defined only by shadow
 * would dissolve there.
 */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**`interactive` adds hover lift; use only when the whole card is clickable. */
  variant?: 'default' | 'raised' | 'interactive' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANTS = {
  default: 'bg-surface border border-line shadow-card',
  raised: 'bg-surface-raised border border-line shadow-lifted',
  interactive:
    'bg-surface border border-line shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-line-strong',
  flat: 'bg-surface-sunken border border-transparent',
};

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div className={cn('rounded-2xl', VARIANTS[variant], PADDING[padding], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-content">{title}</h3>
        {description && <p className="mt-1 text-sm text-content-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
