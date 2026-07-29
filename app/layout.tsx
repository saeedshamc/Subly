import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../lib/hooks/ThemeProvider';
import { I18nProvider } from '../lib/i18n/I18nProvider';

export const metadata: Metadata = {
  title: 'IP Subnet Calculator',
  description:
    'A teaching-first IPv4 and IPv6 subnet calculator with VLSM/FLSM support, bilingual (English/Persian) UI, and light/dark themes.',
};

// Inline script avoids a flash of the wrong theme before React hydrates.
const themeInitScript = `
(function() {
  try {
    var stored = window.localStorage.getItem('subnet-calculator-theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
