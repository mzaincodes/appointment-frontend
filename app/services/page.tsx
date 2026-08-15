import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { clinicService } from '@/services';
import { Footer } from '@/components/layout/Footer';
import { CtaSection, ServicesSection } from '@/components/home/Sections';
import { Button } from '@/components/ui/Button';
import type { Service } from '@/types';

export const metadata: Metadata = {
  title: 'Our services',
  description:
    'Check-ups, cleaning, whitening, fillings, root canals, crowns, implants and orthodontics at Bright Smile Dental Studio.',
};

export const dynamic = 'force-dynamic';

async function getServices(): Promise<Service[]> {
  try {
    const { services } = await clinicService.getServices();
    return services;
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <div className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-text">
            Treatments
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-content text-balance sm:text-5xl">
            Everything your smile needs
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-content-muted text-pretty">
            Prices shown are starting points — your dentist confirms the exact fee in writing before
            any treatment begins. Every visit starts as a 30-minute appointment.
          </p>
          <div className="mt-8">
            <Link href="/book">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Book an appointment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {services.length > 0 ? (
        <ServicesSection services={services} />
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-content-muted">
            Our service list is temporarily unavailable. Please call{' '}
            <a href="tel:+14155550142" className="font-medium text-brand-text">
              +1 (415) 555-0142
            </a>
            .
          </p>
        </div>
      )}

      <CtaSection />
      <Footer />
    </>
  );
}
