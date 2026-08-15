import Link from 'next/link';
import { CalendarCheck2, MessageCircle, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

/**
 * Two-column shell shared by sign-in and registration.
 *
 * The right-hand panel is decorative on desktop and dropped entirely on mobile,
 * where vertical space belongs to the form.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-content sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-content-muted text-pretty">
              {subtitle}
            </p>
          </div>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-content-muted">{footer}</div>
        </div>
      </div>

      {/* Decorative panel */}
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:items-center lg:justify-center">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-on-solid/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-on-solid/10 blur-3xl"
          aria-hidden
        />

        <div className="relative max-w-md px-12 text-brand-on-solid">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-balance">
            Dental care that fits around your life
          </h2>
          <p className="mt-4 text-base leading-relaxed opacity-85 text-pretty">
            Join more than 6,000 patients who book, reschedule and manage their appointments without
            ever picking up the phone.
          </p>

          <ul className="mt-10 space-y-5">
            {[
              {
                icon: CalendarCheck2,
                title: 'Book in under a minute',
                body: 'See the times genuinely free and confirm instantly.',
              },
              {
                icon: MessageCircle,
                title: 'Ask our assistant anything',
                body: 'Opening hours, prices, or booking — answered on the spot.',
              },
              {
                icon: ShieldCheck,
                title: 'Change plans freely',
                body: 'Free cancellation up to 24 hours before your visit.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-on-solid/15 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-sm opacity-80">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-12 text-xs opacity-70">
            <Link href="/" className="underline underline-offset-2">
              ← Back to the clinic site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
