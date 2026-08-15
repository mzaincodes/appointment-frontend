import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider, themeInitScript } from '@/hooks/useTheme';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/ui/Toast';
import { Header } from '@/components/layout/Header';
import { ChatWidget } from '@/components/chatbot/ChatWidget';

/**
 * Root layout.
 *
 * Fonts are loaded through `next/font`, which self-hosts them and emits CSS
 * variables — no render-blocking request to Google and no layout shift when the
 * face swaps in.
 */

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// A slightly warmer geometric face for headings, so display type reads as
// designed rather than as "the body font, but bigger".
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'Bright Smile Dental Studio — Book your appointment online',
    template: '%s · Bright Smile Dental Studio',
  },
  description:
    'Modern family and cosmetic dentistry in San Francisco. Book a 30-minute appointment online in under a minute, or ask our assistant anything about the clinic.',
  keywords: ['dentist', 'dental clinic', 'appointment booking', 'San Francisco', 'teeth whitening'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Matches the canvas token in each theme so the mobile browser chrome blends
  // with the page instead of showing a white bar in dark mode.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#090c14' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/*
 Applies the stored theme before the first paint. Without this the page
 renders light and then flips, which is visible on every load.
`suppressHydrationWarning` above is required because this script
 mutates <html> before React hydrates.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-canvas font-sans">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {/* Lets keyboard users jump past the nav on every page. */}
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-solid focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-on-solid"
              >
                Skip to content
              </a>

              <div className="flex min-h-dvh flex-col">
                <Header />
                <main id="main" className="flex-1">
                  {children}
                </main>
              </div>

              {/* Floating assistant, available on every page. */}
              <ChatWidget />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
