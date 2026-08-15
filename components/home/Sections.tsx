import Link from 'next/link';
import {
  Activity,
  Anchor,
  ArrowRight,
  Baby,
  AlignCenter,
  Clock,
  Crown,
  Heart,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  Stethoscope,
  Sun,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn, formatPrice } from '@/lib/utils';
import type { ClinicHours, Service } from '@/types';

/**
 * Landing page sections.
 *
 * Every section renders from data supplied by the clinic API rather than
 * hard-coded copy, so the marketing site, the booking flow and the chatbot all
 * describe the same clinic. Changing a price is a database update.
 */

/** Maps the `icon` slug stored on a service to a component. */
const SERVICE_ICONS: Record<string, typeof Stethoscope> = {
  stethoscope: Stethoscope,
  sparkles: Sparkles,
  shield: Shield,
  sun: Sun,
  activity: Activity,
  crown: Crown,
  anchor: Anchor,
  'align-center': AlignCenter,
  baby: Baby,
  zap: Zap,
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = true,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn('max-w-2xl', centered && 'mx-auto text-center')}>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-text">{eyebrow}</p>
      )}
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-content text-balance sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-content-muted text-pretty">
          {description}
        </p>
      )}
    </div>
  );
}

export function ServicesSection({ services }: { services: Service[] }) {
  return (
    <section id="services" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="What we do"
        title="Complete dental care, under one roof"
        description="From routine check-ups to full smile makeovers. Every appointment starts as a 30-minute visit, and your dentist plans anything longer with you directly."
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const Icon = SERVICE_ICONS[service.icon ?? ''] ?? Stethoscope;
          return (
            <Card key={service.id} variant="interactive" className="group flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 transition-colors group-hover:bg-brand-500/16">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-[11px] font-semibold tabular text-content-muted">
                  {formatPrice(service.priceFrom)}
                </span>
              </div>

              <h3 className="mt-4 font-display text-base font-semibold text-content">
                {service.name}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-content-muted text-pretty">
                {service.description}
              </p>

              <Link
                href="/book"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800"
              >
                Book this
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function DentistsSection({ dentists }: { dentists: { name: string; bio: string }[] }) {
  if (dentists.length === 0) return null;

  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Your team"
          title="The people who will look after you"
          description="Four specialists covering everything from a child's first visit to full implant surgery."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dentists.map((dentist) => {
            // Titles arrive as "Dr. Sarah Chen — Lead Dentist"; split the name
            // from the role so each can be styled.
            const [name, role] = dentist.name.split('—').map((part) => part.trim());
            const nameInitials = (name ?? '')
              .replace(/^Dr\.?\s*/i, '')
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join('');

            return (
              <Card key={dentist.name} variant="default" className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient font-display text-xl font-bold text-brand-on-solid shadow-sm">
                  {nameInitials}
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-content">{name}</h3>
                {role && <p className="mt-1 text-xs font-medium text-brand-text">{role}</p>}
                <p className="mt-3 text-sm leading-relaxed text-content-muted text-pretty">
                  {/* First sentence only — the full bio belongs on a profile page. */}
                  {dentist.bio.split('.').slice(0, 2).join('.')}.
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function WhyUsSection() {
  const reasons = [
    {
      icon: Clock,
      title: 'Booked in under a minute',
      description:
        'Pick a date, choose from the times genuinely free, and confirm. No phone queue, no callback, no waiting to hear back.',
    },
    {
      icon: Heart,
      title: 'Built for nervous patients',
      description:
        'Tell us when you book and we will allow extra time, explain each step before it happens, and agree a stop signal with you.',
    },
    {
      icon: Shield,
      title: 'Free cancellation',
      description:
        'Change or cancel free of charge up to 24 hours before. Manage it yourself online, or just ask our assistant.',
    },
    {
      icon: Sparkles,
      title: 'Modern equipment throughout',
      description:
        'Digital X-rays, intra-oral cameras and same-day CEREC ceramics in every surgery — fewer visits, better fit.',
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Why Bright Smile"
        title="Care that respects your time"
        description="We designed the practice around the two things patients tell us matter most: being seen when promised, and never feeling rushed."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {reasons.map((reason) => {
          const Icon = reason.icon;
          return (
            <Card key={reason.title} variant="default" className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-text">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-content">
                  {reason.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-content-muted text-pretty">
                  {reason.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function HoursAndContactSection({
  hours,
  phone,
  email,
  address,
}: {
  hours: ClinicHours[];
  phone: string;
  email: string;
  address: string;
}) {
  const todayIndex = new Date().getDay();

  return (
    <section id="contact" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Opening hours"
              title="When you can see us"
              centered={false}
              description="We are open six days a week. The last appointment of each day starts at 4:30 PM, because every visit is 30 minutes and must finish by 5:00 PM."
            />

            <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {hours.map((day) => {
                const isToday = day.dayOfWeek === todayIndex;
                return (
                  <li
                    key={day.dayOfWeek}
                    className={cn(
                      'flex items-center justify-between px-4 py-3.5 text-sm transition-colors',
                      isToday ? 'bg-brand-500/8' : 'bg-surface',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn('font-medium', isToday ? 'text-brand-text' : 'text-content')}
                      >
                        {day.dayName}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-text">
                          Today
                        </span>
                      )}
                    </span>
                    {day.isOpen ? (
                      <span className="tabular text-content-muted">
                        {day.opensAt} – {day.closesAt}
                      </span>
                    ) : (
                      <span className="font-medium text-danger-fg">Closed</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <SectionHeading eyebrow="Find us" title="Getting here" centered={false} />

            <div className="mt-8 space-y-3">
              <ContactRow icon={MapPin} label="Address" value={address} />
              <ContactRow
                icon={Phone}
                label="Phone"
                value={phone}
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
              />
              <ContactRow icon={Mail} label="Email" value={email} href={`mailto:${email}`} />
            </div>

            <Card variant="flat" className="mt-4">
              <p className="text-sm leading-relaxed text-content-muted text-pretty">
                Two hours of free patient parking are available in the building garage — bring your
                ticket to reception for validation. The practice is fully step-free with lift access
                to the third floor.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-text">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">{label}</p>
        <p className="mt-0.5 text-sm text-content">{value}</p>
      </div>
    </>
  );

  const className =
    'flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors';

  return href ? (
    <a href={href} className={cn(className, 'hover:border-line-strong hover:bg-surface-sunken')}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function CtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center shadow-lifted sm:px-12 sm:py-16">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-on-solid/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brand-on-solid/10 blur-2xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-brand-on-solid text-balance sm:text-4xl">
            Ready when you are
          </h2>
          <p className="mt-4 text-base leading-relaxed text-brand-on-solid/90 text-pretty">
            Choose a time that suits you and you are booked in — you do not even need an account.
            Prefer to talk it through? Our assistant is in the corner of every page.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book">
              <Button size="lg" variant="on-solid" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Book an appointment
              </Button>
            </Link>
            <a href="tel:+14155550142">
              <Button
                size="lg"
                variant="on-solid-outline"
                fullWidth
                leftIcon={<Phone className="h-4 w-4" />}
              >
                Call the clinic
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
