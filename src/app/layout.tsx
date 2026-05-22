import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/context/providers';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'BookingCena — Organizza le tue uscite',
  description: 'Gestisci disponibilità per cene, aperitivi ed eventi con stile',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <Navbar />
          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
