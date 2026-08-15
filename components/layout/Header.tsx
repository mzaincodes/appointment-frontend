'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn, initials } from '@/lib/utils';
import { canAccess } from '@/lib/route-policy';
import { Button } from '@/components/ui/Button';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

/**
 * Site header.
 *
 * Sticky, with the background becoming opaque once the page scrolls — so it
 * floats over the hero at rest but never lets content show through behind the
 * links.
 *
 * The admin link is rendered only for administrators, purely as a convenience.
 * It is not a security boundary:`/api/admin/*` checks the role on the server
 * for every request, so hiding the link changes nothing about who can reach it.
 */

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/book', label: 'Book Appointment' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigating away should always close both menus.
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  // Lock body scroll behind the mobile drawer.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  // Never offer a link the current role would only be bounced from. The same
  // policy drives the guard, so the nav and the guard cannot disagree.
  const role = user?.role ?? null;
  const navLinks = NAV_LINKS.filter((link) => canAccess(link.href, role));
  const canBook = canAccess('/book', role);
  const canSeeOwnAppointments = canAccess('/appointments', role);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-300',
          scrolled
            ? 'border-b border-line bg-surface/85 backdrop-blur-xl shadow-sm'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive(link.href) ? 'text-brand-text' : 'text-content-muted hover:text-content',
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full bg-brand-solid" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            {loading ? (
              <div className="skeleton hidden h-10 w-24 rounded-xl sm:block" />
            ) : isAuthenticated ? (
              <div ref={menuRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-line-strong"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-[11px] font-bold text-brand-on-solid">
                    {initials(user!.name)}
                  </span>
                  <span className="max-w-[8rem] truncate text-sm font-medium text-content">
                    {user!.name.split(' ')[0]}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-content-subtle transition-transform',
                      menuOpen && 'rotate-180',
                    )}
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-12 z-50 w-60 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-lifted"
                  >
                    <div className="border-b border-line px-4 py-3">
                      <p className="truncate text-sm font-semibold text-content">{user!.name}</p>
                      <p className="truncate text-xs text-content-subtle">{user!.email}</p>
                      {isAdmin && (
                        <span className="mt-2 inline-flex rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-text">
                          Administrator
                        </span>
                      )}
                    </div>
                    <div className="p-1">
                      {canSeeOwnAppointments && (
                        <MenuLink href="/appointments" icon={CalendarDays}>
                          My appointments
                        </MenuLink>
                      )}
                      <MenuLink href="/profile" icon={UserIcon}>
                        Profile
                      </MenuLink>
                      {isAdmin && (
                        <MenuLink href="/admin" icon={LayoutDashboard}>
                          Admin dashboard
                        </MenuLink>
                      )}
                    </div>
                    <div className="border-t border-line p-1">
                      <button
                        type="button"
                        onClick={() => void logout()}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content-muted transition-colors hover:bg-danger-bg hover:text-danger-fg"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                {canBook && (
                  <Link href="/book">
                    <Button size="sm">Book now</Button>
                  </Link>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-content-muted transition-colors hover:text-content lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <nav
            className="absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] animate-fade-up overflow-y-auto border-b border-line bg-surface p-4 shadow-lifted"
            aria-label="Mobile"
          >
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'block rounded-xl px-4 py-3 text-[15px] font-medium transition-colors',
                    isActive(link.href)
                      ? 'bg-brand-500/12 text-brand-text'
                      : 'text-content-muted hover:bg-surface-sunken hover:text-content',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 border-t border-line pt-4">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 rounded-xl bg-surface-sunken px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-xs font-bold text-brand-on-solid">
                      {initials(user!.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-content">{user!.name}</p>
                      <p className="truncate text-xs text-content-subtle">{user!.email}</p>
                    </div>
                  </div>
                  {canSeeOwnAppointments && (
                    <MobileLink href="/appointments" icon={CalendarDays}>
                      My appointments
                    </MobileLink>
                  )}
                  <MobileLink href="/profile" icon={UserIcon}>
                    Profile
                  </MobileLink>
                  {isAdmin && (
                    <MobileLink href="/admin" icon={LayoutDashboard}>
                      Admin dashboard
                    </MobileLink>
                  )}
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-content-muted transition-colors hover:bg-danger-bg hover:text-danger-fg"
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {canBook && (
                    <Link href="/book">
                      <Button fullWidth size="lg">
                        Book an appointment
                      </Button>
                    </Link>
                  )}
                  <Link href="/login">
                    <Button fullWidth variant="secondary" size="lg">
                      Sign in
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof UserIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content-muted transition-colors hover:bg-surface-sunken hover:text-content"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof UserIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-content-muted transition-colors hover:bg-surface-sunken hover:text-content"
    >
      <Icon className="h-[18px] w-[18px]" />
      {children}
    </Link>
  );
}
