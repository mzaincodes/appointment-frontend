import { clinicService } from '@/services';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/home/Hero';
import {
  CtaSection,
  DentistsSection,
  HoursAndContactSection,
  ServicesSection,
  WhyUsSection,
} from '@/components/home/Sections';
import type { ClinicInfo } from '@/types';

/**
 * Landing page.
 *
 * A React Server Component: the clinic details are fetched on the server, so
 * the page arrives fully rendered rather than flashing skeletons for content
 * that changes about once a year.
 *
 *`no-store` keeps it honest during development — opening hours edited in the
 * database show up on the next refresh instead of being served from a stale
 * build. A production deployment would use a short `revalidate` window.
 */
export const dynamic = 'force-dynamic';

/**
 * Fallback used when the API is unreachable.
 *
 * The landing page is the front door; it should never show an error screen just
 * because the backend is restarting. Booking still routes to /book, which
 * reports the problem properly if it persists.
 */
const FALLBACK: ClinicInfo = {
  name: 'Bright Smile Dental Studio',
  tagline: 'Modern dentistry, gently delivered.',
  description: '',
  phone: '+1 (415) 555-0142',
  email: 'hello@brightsmiledental.com',
  address: '218 Marina Boulevard, Suite 300, San Francisco, CA 94123',
  slotDurationMinutes: 30,
  hours: [
    {
      dayOfWeek: 0,
      dayName: 'Sunday',
      isOpen: false,
      opensAt: null,
      closesAt: null,
    },
    {
      dayOfWeek: 1,
      dayName: 'Monday',
      isOpen: true,
      opensAt: '09:00',
      closesAt: '17:00',
    },
    {
      dayOfWeek: 2,
      dayName: 'Tuesday',
      isOpen: true,
      opensAt: '09:00',
      closesAt: '17:00',
    },
    {
      dayOfWeek: 3,
      dayName: 'Wednesday',
      isOpen: true,
      opensAt: '09:00',
      closesAt: '17:00',
    },
    {
      dayOfWeek: 4,
      dayName: 'Thursday',
      isOpen: true,
      opensAt: '09:00',
      closesAt: '17:00',
    },
    {
      dayOfWeek: 5,
      dayName: 'Friday',
      isOpen: true,
      opensAt: '09:00',
      closesAt: '17:00',
    },
    {
      dayOfWeek: 6,
      dayName: 'Saturday',
      isOpen: true,
      opensAt: '09:00',
      closesAt: '17:00',
    },
  ],
  services: [],
  dentists: [],
  location: '',
};

async function getClinic(): Promise<ClinicInfo> {
  try {
    return await clinicService.getInfo();
  } catch {
    return FALLBACK;
  }
}

export default async function HomePage() {
  const clinic = await getClinic();

  return (
    <>
      <Hero />
      {clinic.services.length > 0 && <ServicesSection services={clinic.services} />}
      <WhyUsSection />
      <DentistsSection dentists={clinic.dentists} />
      <HoursAndContactSection
        hours={clinic.hours}
        phone={clinic.phone}
        email={clinic.email}
        address={clinic.address}
      />
      <CtaSection />
      <Footer hours={clinic.hours} />
    </>
  );
}
