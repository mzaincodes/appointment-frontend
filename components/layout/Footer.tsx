import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from './Logo';

/**
 * Site footer.
 *
 * Opening hours are passed in from the clinic API rather than written here, so
 * the footer, the booking calendar and the chatbot all describe the same
 * schedule.
 */

interface FooterProps {
  hours?: Array<{
    dayName: string;
    isOpen: boolean;
    opensAt: string | null;
    closesAt: string | null;
  }>;
}

const DEFAULT_HOURS = [
  {
    dayName: 'Monday – Saturday',
    isOpen: true,
    opensAt: '09:00',
    closesAt: '17:00',
  },
  { dayName: 'Sunday', isOpen: false, opensAt: null, closesAt: null },
];

export function Footer({ hours }: FooterProps) {
  // Collapse the six identical weekdays into one line — listing them
  // individually is noise when they never differ.
  const displayHours = (() => {
    if (!hours || hours.length === 0) return DEFAULT_HOURS;
    const open = hours.filter((day) => day.isOpen);
    const closed = hours.filter((day) => !day.isOpen);
    const allSame =
      open.length > 1 &&
      open.every((day) => day.opensAt === open[0]!.opensAt && day.closesAt === open[0]!.closesAt);

    if (!allSame) return hours;

    return [
      {
        dayName: `${open[0]!.dayName} – ${open[open.length - 1]!.dayName}`,
        isOpen: true,
        opensAt: open[0]!.opensAt,
        closesAt: open[0]!.closesAt,
      },
      ...closed,
    ];
  })();

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-content-muted text-pretty">
              Modern family and cosmetic dentistry in San Francisco&rsquo;s Marina District, caring
              for our community since 2009.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-content">Quick links</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { href: '/book', label: 'Book an appointment' },
                { href: '/services', label: 'Our services' },
                { href: '/appointments', label: 'My appointments' },
                { href: '/contact', label: 'Contact & FAQ' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-content-muted transition-colors hover:text-brand-text"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-content">Opening hours</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {displayHours.map((day) => (
                <li key={day.dayName} className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
                  <span className="text-content-muted">
                    <span className="block font-medium text-content">{day.dayName}</span>
                    {day.isOpen ? (
                      <span className="tabular">
                        {day.opensAt} – {day.closesAt}
                      </span>
                    ) : (
                      <span className="text-danger-fg">Closed</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-content">Get in touch</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="tel:+14155550142"
                  className="flex items-start gap-2.5 text-content-muted transition-colors hover:text-brand-text"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
                  +1 (415) 555-0142
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@brightsmiledental.com"
                  className="flex items-start gap-2.5 break-all text-content-muted transition-colors hover:text-brand-text"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
                  hello@brightsmiledental.com
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-content-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
                <span>
                  218 Marina Boulevard, Suite 300
                  <br />
                  San Francisco, CA 94123
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-8 text-xs text-content-subtle sm:flex-row">
          <p>© {new Date().getFullYear()} Bright Smile Dental Studio. All rights reserved.</p>
          <p className="text-center sm:text-right">
            A demonstration project — not a real clinic, and not for real patient data.
          </p>
        </div>
      </div>
    </footer>
  );
}
