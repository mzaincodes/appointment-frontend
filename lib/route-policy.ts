import type { UserRole } from '@/types';

/**
 * Route access policy — the single source of truth for who may see what.
 *
 * Every guard, redirect and navigation link reads from this table rather than
 * testing `role === 'ADMIN'` inline. One table means the rules cannot disagree
 * with each other, and changing the policy is an edit here rather than a hunt
 * through components.
 *
 * ## This is UX, not security
 *
 * Keeping an admin off `/appointments` and a patient off `/admin` makes the app
 * coherent — it does not protect anything. The real boundary is the API, where
 * every `/api/admin/*` route verifies the JWT *and* the role on the server for
 * each request. Deleting this file would give an attacker one thing: pages that
 * render empty and fill with 403s.
 */

export type Access =
  /** Anyone, signed in or not. */
  | 'public'
  /** Any signed-in user, either role. */
  | 'authenticated'
  /** Signed-in patients only — an admin is redirected away. */
  | 'patient'
  /**
   * Everyone except administrators — guests included.
   *
   * This exists for `/book`: the booking flow must stay open to signed-out
   * visitors (booking without an account is a core feature), while an admin
   * belongs in the dashboard, which has its own create-appointment action.
   */
  | 'non-admin'
  /** Administrators only — a patient is redirected away. */
  | 'admin';

/**
 * Longest-prefix wins, so `/admin/reports` inherits `/admin` without needing
 * its own entry. Anything unlisted is public.
 */
const RULES: ReadonlyArray<{ prefix: string; access: Access }> = [
  { prefix: '/admin', access: 'admin' },
  { prefix: '/appointments', access: 'patient' },
  // Guests must be able to book; administrators must not.
  { prefix: '/book', access: 'non-admin' },
  // Account settings belong to whoever is signed in — an administrator still
  // needs to change their own password and phone number.
  { prefix: '/profile', access: 'authenticated' },
];

export function accessFor(pathname: string): Access {
  let match: { prefix: string; access: Access } | null = null;
  for (const rule of RULES) {
    const isMatch = pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (isMatch && (!match || rule.prefix.length > match.prefix.length)) match = rule;
  }
  return match?.access ?? 'public';
}

/** `null` role means "signed out". */
export function canAccess(pathname: string, role: UserRole | null): boolean {
  switch (accessFor(pathname)) {
    case 'public':
      return true;
    case 'authenticated':
      return role !== null;
    case 'patient':
      return role === 'USER';
    case 'non-admin':
      return role !== 'ADMIN';
    case 'admin':
      return role === 'ADMIN';
  }
}

/**
 * The landing page for a role — where someone belongs when they are sent
 * somewhere they may not go, and where sign-in drops them by default.
 */
export function homeFor(role: UserRole | null): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'USER') return '/appointments';
  return '/';
}

/** A short explanation for the redirect, shown once as a toast. */
export function deniedMessage(pathname: string, role: UserRole | null): string {
  const access = accessFor(pathname);
  if (access === 'admin') return 'That area is for clinic staff only.';
  if (role === 'ADMIN' && (access === 'patient' || access === 'non-admin')) {
    return 'That page is part of the patient area. Use the dashboard to manage appointments.';
  }
  return 'You do not have access to that page.';
}

/**
 * Validates a `?next=` destination before redirecting to it.
 *
 * Without this, the sign-in chain hands out access it should not: a guest who
 * hits `/admin` is sent to `/login?next=/admin`, and registering from there
 * would drop a brand-new patient onto an admin route. It also refuses absolute
 * URLs, which would otherwise make the login page an open redirect.
 */
export function sanitiseNext(next: string | null, role: UserRole | null): string | null {
  if (!next) return null;
  // Must be a same-origin, root-relative path. `//evil.com` is protocol-relative.
  if (!next.startsWith('/') || next.startsWith('//')) return null;

  const pathname = next.split('?')[0]!.split('#')[0]!;
  return canAccess(pathname, role) ? next : null;
}

/** Where to send someone who may not be where they are; `null` = let them stay. */
export function redirectFor(pathname: string, role: UserRole | null): string | null {
  if (canAccess(pathname, role)) return null;
  if (role === null) return `/login?next=${encodeURIComponent(pathname)}`;
  return homeFor(role);
}
