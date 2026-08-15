import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Clinic mark.
 *
 * An inline SVG tooth rather than an image file: it inherits `currentColor`, so
 * it adapts to both themes with no second asset and no flash while loading.
 */
export function Logo({
  className,
  showText = true,
  href = '/',
}: {
  className?: string;
  showText?: boolean;
  href?: string | null;
}) {
  const mark = (
    <>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-brand-on-solid" aria-hidden>
          <path
            d="M12 3.2c-1.6 0-2.3.7-4 .7-1.9 0-3.4-.7-4.6.6-1.1 1.2-1 3.3-.5 5.6.4 1.8 1 2.9 1.4 4.6.3 1.3.5 2.7.8 4 .3 1.2.8 2.3 1.8 2.3 1.2 0 1.5-1.4 1.7-2.8.2-1.3.4-2.7.7-3.7.3-.9.8-1.5 1.7-1.5s1.4.6 1.7 1.5c.3 1 .5 2.4.7 3.7.2 1.4.5 2.8 1.7 2.8 1 0 1.5-1.1 1.8-2.3.3-1.3.5-2.7.8-4 .4-1.7 1-2.8 1.4-4.6.5-2.3.6-4.4-.5-5.6-1.2-1.3-2.7-.6-4.6-.6-1.7 0-2.4-.7-4-.7Z"
            fill="currentColor"
          />
        </svg>
      </span>
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-bold tracking-tight text-content">
            Bright Smile
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-content-subtle">
            Dental Studio
          </span>
        </span>
      )}
    </>
  );

  if (href === null) {
    return <div className={cn('flex items-center gap-2.5', className)}>{mark}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-85',
        className,
      )}
      aria-label="Bright Smile Dental Studio — home"
    >
      {mark}
    </Link>
  );
}
