import type { Metadata } from 'next';
import { clinicService } from '@/services';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Footer } from '@/components/layout/Footer';
import type { Service } from '@/types';

export const metadata: Metadata = {
  title: 'Book an appointment',
  description:
    'Choose a date and a 30-minute appointment time at Bright Smile Dental Studio. No account needed.',
};

export const dynamic = 'force-dynamic';

/**
 * Booking page.
 *
 * The service list is fetched on the server so the treatment dropdown is
 * populated on first paint. Availability is deliberately *not* fetched here —
 * it changes minute to minute, so it is loaded client-side once a date is
 * chosen and refreshed again before the booking is confirmed.
 */
async function getServices(): Promise<Service[]> {
  try {
    const { services } = await clinicService.getServices();
    return services;
  } catch {
    // The treatment dropdown is optional; booking works without it.
    return [];
  }
}

export default async function BookPage() {
  const services = await getServices();

  return (
    <>
      <div className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-text">
            Book online
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-content text-balance sm:text-4xl">
            Reserve your appointment
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-content-muted text-pretty">
            Four quick steps and you&rsquo;re booked. Every appointment is 30 minutes, and you
            don&rsquo;t need an account.
          </p>
        </div>
      </div>

      <div className="px-4 py-10 sm:px-6 sm:py-14">
        {/* Guests and patients may book; administrators are sent to the
            dashboard, which has its own create-appointment action. */}
        <ProtectedRoute>
          <BookingFlow services={services} />
        </ProtectedRoute>
      </div>

      <Footer />
    </>
  );
}
