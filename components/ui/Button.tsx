'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Button.
 *
 * Variants describe *intent* (primary, danger, ghost) rather than appearance,
 * so a theme change or a palette tweak never means editing call sites.
 *
 *`loading` swaps in a spinner and disables the button, which is what stops the
 * double-submit that would otherwise create two appointments from one impatient
 * click. The label stays visible so the button does not change width mid-action.
 */

type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline'
  | 'subtle'
  | 'on-solid'
  | 'on-solid-outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-solid text-brand-on-solid shadow-sm hover:bg-brand-solid-hover',
  secondary:
    'bg-surface-sunken text-content hover:bg-line active:bg-line-strong border border-line',
  outline:
    'border border-line-strong bg-transparent text-content hover:bg-surface-sunken active:bg-line',
  ghost: 'bg-transparent text-content-muted hover:bg-surface-sunken hover:text-content',
  subtle: 'bg-brand-500/10 text-brand-700 hover:bg-brand-500/16',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800',
  // For buttons placed on a brand-solid / gradient surface. Declared as
  // variants so the colours come from one place — overriding `text-*` via
  // className is unreliable, since CSS order decides the winner, not the
  // order the classes appear in the string.
  'on-solid': 'bg-brand-on-solid text-brand-solid shadow-sm hover:bg-brand-on-solid/90',
  'on-solid-outline':
    'border border-brand-on-solid/40 bg-transparent text-brand-on-solid hover:bg-brand-on-solid/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      // Communicates the busy state to assistive technology, which cannot see
      // the spinner.
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-all duration-200 ease-out',
        'disabled:pointer-events-none disabled:opacity-50',
        // A subtle press effect gives the click physical feedback.
        'active:scale-[0.98]',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});
