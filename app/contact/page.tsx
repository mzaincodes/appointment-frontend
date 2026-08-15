import type { Metadata } from 'next';
import { clinicService } from '@/services';
import { Footer } from '@/components/layout/Footer';
import { HoursAndContactSection, SectionHeading } from '@/components/home/Sections';
import { Card } from '@/components/ui/Card';
import type { ClinicInfo, KnowledgeDocument } from '@/types';

export const metadata: Metadata = {
  title: 'Contact & FAQ',
  description:
    'Find Bright Smile Dental Studio, see our opening hours, and read answers to the questions patients ask most.',
};

export const dynamic = 'force-dynamic';

/**
 * Contact and FAQ page.
 *
 * The FAQ is rendered from `clinic_knowledge` — the *same* rows the chatbot
 * retrieves from. That is the point: correcting an answer once updates both the
 * page and the assistant, so the two can never contradict each other.
 */
async function getData(): Promise<{
  clinic: ClinicInfo | null;
  faq: KnowledgeDocument[];
}> {
  try {
    const [clinic, { documents }] = await Promise.all([
      clinicService.getInfo(),
      clinicService.getFaq(),
    ]);
    return { clinic, faq: documents };
  } catch {
    return { clinic: null, faq: [] };
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  hours: 'Opening hours',
  appointments: 'Appointments & booking',
  services: 'Treatments',
  pricing: 'Payment & pricing',
  location: 'Finding us',
  policies: 'Clinic policies',
  dentists: 'Our dentists',
  general: 'About the clinic',
};

export default async function ContactPage() {
  const { clinic, faq } = await getData();

  // Group by category so the FAQ reads as sections rather than a flat list.
  const grouped = faq.reduce<Record<string, KnowledgeDocument[]>>((accumulator, document) => {
    (accumulator[document.category] ??= []).push(document);
    return accumulator;
  }, {});

  const orderedCategories = Object.keys(CATEGORY_LABELS).filter((category) => grouped[category]);

  return (
    <>
      <div className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-text">
            Get in touch
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-content text-balance sm:text-5xl">
            We&rsquo;re here to help
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-content-muted text-pretty">
            Call, email, or ask the assistant in the corner of the screen — it can answer most of
            these questions instantly and book you in.
          </p>
        </div>
      </div>

      {clinic && (
        <HoursAndContactSection
          hours={clinic.hours}
          phone={clinic.phone}
          email={clinic.email}
          address={clinic.address}
        />
      )}

      {orderedCategories.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions patients ask most"
            description="These are the same answers our assistant works from, so you will always get a consistent reply."
          />

          <div className="mt-12 space-y-10">
            {orderedCategories.map((category) => (
              <div key={category}>
                <h2 className="font-display text-lg font-bold text-content">
                  {CATEGORY_LABELS[category]}
                </h2>
                <div className="mt-4 space-y-3">
                  {grouped[category]!.map((document) => (
                    <Card key={document.id} variant="default">
                      <h3 className="text-sm font-semibold text-content">{document.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-content-muted text-pretty">
                        {document.content}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer hours={clinic?.hours} />
    </>
  );
}
