'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Theme management.
 *
 * Three states, not two:`light`, `dark`, and `system` (follow the OS). A
 * person who has their laptop switch to dark in the evening expects this site
 * to follow unless they said otherwise, so "system" is the default.
 *
 * The choice persists in localStorage. Applying it is deliberately split:
 * a blocking inline script in `layout.tsx` sets the class before first paint —
 * without it every visit flashes white before the dark theme lands — and this
 * hook keeps React's view in sync afterwards.
 */

export type ThemeChoice = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'bsds.theme';

interface ThemeContextValue {
  theme: ThemeChoice;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeChoice) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return context;
}

/**
 * Inline script injected into `<head>`.
 *
 * Runs before the first paint, so the correct theme is on `<html>` when the
 * page renders. Kept as a string because it must execute ahead of React.
 */
export const themeInitScript = `
(function() {
 try {
 var stored = localStorage.getItem('${STORAGE_KEY}');
 var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
 var isDark = stored ==='dark' || ((!stored || stored ==='system') && prefersDark);
 document.documentElement.classList.toggle('dark', isDark);
 document.documentElement.style.colorScheme = isDark ?'dark' :'light';
  } catch (e) {}
})();
`;

function systemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts at 'system ' on both server and client so hydration matches; the
  // stored preference is read in the effect below. The inline script has
  // already painted the right theme, so this never causes a visible flash.
  const [theme, setThemeState] = useState<ThemeChoice>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const stored = (() => {
      try {
        return window.localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
      } catch {
        return null;
      }
    })();

    const initial: ThemeChoice =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';

    setThemeState(initial);
    setResolvedTheme(initial === 'system' ? systemPreference() : initial);
  }, []);

  // Follow the OS live while the choice is 'system '.
  useEffect(() => {
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = media.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    const resolved = next === 'system' ? systemPreference() : next;
    setResolvedTheme(resolved);
    applyTheme(resolved);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private browsing — the theme still applies for this session */
    }
  }, []);

  /**
   * Toggles between light and dark.
   *
   * Toggling from 'system ' commits to the opposite of what is currently
   * showing, which is what someone clicking a sun/moon icon expects — not a
   * cycle through a third state they did not ask about.
   */
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
