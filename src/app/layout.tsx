import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BookingCena — Organizza le tue uscite',
  description: 'Gestisci disponibilità per cene, aperitivi ed eventi con stile',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen">
        <nav className="glass sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="text-2xl">🍽️</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              BookingCena
            </span>
          </a>
          <a
            href="/admin"
            className="text-sm text-white/60 hover:text-white/90 transition-colors flex items-center gap-1"
          >
            <span>🔐</span> Admin
          </a>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
