'use client';

import { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeChoice } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

/**
 * Theme toggle.
 *
 * A single click flips light/dark — the common case — while a small dropdown
 * exposes the third option, "System". Hiding "System" behind the menu keeps the
 * primary action a one-click affair without losing the setting people who care
 * about it want.
 */

const OPTIONS: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={toggleTheme}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen((open) => !open);
        }}
        // Long-press on touch, right-click on desktop, or the chevron below all
        // reach the same menu.
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        title={`${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
        className={cn(
          'group relative flex h-10 w-10 items-center justify-center rounded-xl',
          'border border-line bg-surface text-content-muted',
          'transition-all duration-200 hover:border-line-strong hover:text-content hover:shadow-sm',
          'active:scale-95',
        )}
      >
        {/* Both icons are rendered and cross-faded, so the swap animates. */}
        <Sun
          className={cn(
            'absolute h-[18px] w-[18px] transition-all duration-300',
            resolvedTheme === 'dark'
              ? 'rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100',
          )}
        />
        <Moon
          className={cn(
            'absolute h-[18px] w-[18px] transition-all duration-300',
            resolvedTheme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0',
          )}
        />
      </button>

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Theme options"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-line bg-surface text-[7px] text-content-subtle transition-colors hover:text-content"
      >
        ▾
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-40 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lifted"
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(option.value);
                  setMenuOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-brand-500/12 font-medium text-brand-text'
                    : 'text-content-muted hover:bg-surface-sunken hover:text-content',
                )}
              >
                <Icon className="h-4 w-4" />
                {option.label}
                {active && <span className="ml-auto text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
