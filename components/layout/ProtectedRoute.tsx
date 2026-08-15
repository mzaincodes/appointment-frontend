'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { canAccess, deniedMessage, redirectFor } from '@/lib/route-policy';
import { LoadingSpinner } from '@/components/ui/Feedback';

/**
 * Client-side route guard.
 *
 * Reads the policy in `lib/route-policy.ts`, so a page never decides for itself
 * who may see it. Someone who does not belong is **redirected**, not shown a
 * "restricted" screen — leaving a patient parked on `/admin` invites them to
 * keep trying, and the URL suggests the page is theirs to reach.
 *
 * ## This is convenience, not security
 *
 * The redirect saves people a confusing empty screen. It protects nothing.
 * Every admin endpoint verifies the JWT *and* the role on the server for every
 * request, so removing this component from the bundle yields exactly one thing:
 * a page that renders empty and fills with 403s.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const role = user?.role ?? null;
  const allowed = canAccess(pathname, role);

  // The toast fires from an effect, and React runs effects twice in
  // development. A ref keyed by path stops the same message appearing twice.
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const destination = redirectFor(pathname, role);
    if (!destination) return;

    // Explain the bounce once, so it does not read as the app losing its place.
    // Signed-out visitors get the sign-in page, which explains itself.
    if (announced.current !== pathname && role !== null) {
      announced.current = pathname;
      toast.info('Redirected', deniedMessage(pathname, role));
    }

    router.replace(destination);
  }, [loading, pathname, role, router, toast]);

  if (loading) {
    return <LoadingSpinner label="Checking your session…" className="min-h-[60vh]" />;
  }

  // Render nothing while the redirect is in flight rather than flashing a page
  // this person is not allowed to see.
  if (!allowed) {
    return <LoadingSpinner label="Taking you somewhere else…" className="min-h-[60vh]" />;
  }

  return <>{children}</>;
}
