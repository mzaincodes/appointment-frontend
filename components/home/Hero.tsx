import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Landing hero.
 *
 * Leads with the action rather than a slogan: the primary reason anyone opens a
 * clinic site is to get an appointment, so the booking CTA is the first thing
 * in the tab order and the largest element on the page.
 *
 * The trust markers below the fold-line (rating, patient count, hours) are the
 * things a nervous first-time patient actually scans for.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow — decorative only, so it is hidden from assistive tech. */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden />
      <div
        className="pointer-events-none absolute -right-32 -top-24 h-[420px] w-[420px] rounded-full bg-brand-400/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-40 top-40 h-[380px] w-[380px] rounded-full bg-accent-400/8 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/8 px-3.5 py-1.5 text-xs font-medium text-brand-text">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              Accepting new patients
            </div>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tighter text-content text-balance sm:text-5xl lg:text-6xl">
              Dentistry that feels{' '}
              {/* Both stops clear 3:1 for large text on the canvas in either theme;
                  brand-400 did not (~1.9:1 in light). */}
              <span className="bg-gradient-to-r from-brand-solid to-brand-600 bg-clip-text text-transparent">
                genuinely calm
              </span>
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-content-muted text-pretty">
              Modern family and cosmetic dental care in San Francisco&rsquo;s Marina District. Book
              a 30-minute appointment online in under a minute — no phone calls, no waiting on hold.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="sm:w-auto">
                <Button size="md" fullWidth rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Book an appointment
                </Button>
              </Link>
              <Link href="/services" className="sm:w-auto">
                <Button size="md" variant="outline" fullWidth>
                  Explore our services
                </Button>
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-8">
              {[
                { value: '6,000+', label: 'Patients cared for' },
                { value: '16 yrs', label: 'Serving the Marina' },
                { value: '4.9★', label: 'Average rating' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="font-display text-2xl font-bold text-content">{stat.value}</dt>
                  <dd className="mt-0.5 text-xs leading-tight text-content-subtle">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Booking preview card — shows the product rather than a stock photo. */}
          <div className="relative lg:pl-8">
            <div className="relative rounded-3xl border border-line bg-surface p-6 shadow-lifted sm:p-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/12 text-brand-text">
                    <CalendarDays className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-content">Next available</p>
                    <p className="text-xs text-content-subtle">30-minute appointments</p>
                  </div>
                </div>
                <span className="rounded-full bg-success-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success-fg">
                  Open now
                </span>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-2">
                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30'].map(
                  (time, index) => (
                    <div
                      key={time}
                      className={`rounded-xl border px-2 py-2.5 text-center text-xs font-semibold tabular transition-colors ${
                        index === 5
                          ? 'border-brand-500 bg-brand-500/12 text-brand-text'
                          : index === 2 || index === 6
                            ? 'border-line bg-surface-sunken text-content-subtle line-through'
                            : 'border-line bg-surface text-content'
                      }`}
                    >
                      {time}
                    </div>
                  ),
                )}
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-xl bg-surface-sunken px-3.5 py-3">
                <Clock className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
                <p className="text-xs text-content-muted">
                  Mon–Sat, 9:00 AM – 5:00 PM · Closed Sundays
                </p>
              </div>

              <Link href="/book" className="mt-4 block">
                <Button fullWidth rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Choose your time
                </Button>
              </Link>
            </div>

            {/*
 Floating badges. Shown only from xl up, where the two-column grid
 is wide enough for them to sit clear of the card rather than on
 top of its content.
            */}
            <div className="absolute -left-3 top-14 hidden animate-fade-up rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-lifted 2xl:flex 2xl:items-center 2xl:gap-2.5">
              <ShieldCheck className="h-4 w-4 text-brand-text" aria-hidden />
              <span className="text-xs font-medium text-content">Free cancellation</span>
            </div>
            <div className="absolute -bottom-5 right-4 hidden animate-fade-up rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-lifted xl:flex xl:items-center xl:gap-2.5">
              <Star className="h-4 w-4 fill-accent-500 text-accent-500" aria-hidden />
              <span className="text-xs font-medium text-content">4.9 from 800+ reviews</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
