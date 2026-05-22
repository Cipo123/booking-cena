'use client';

import { useTheme, useLang } from '@/context/providers';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();

  return (
    <nav
      className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--card-border)',
      }}
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 font-black text-xl tracking-tight">
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

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <div className="flex rounded-xl overflow-hidden glass" style={{ border: '1px solid var(--card-border)' }}>
          <button
            onClick={() => setLang('it')}
            className={`px-3 py-1.5 text-xs font-semibold transition-all ${
              lang === 'it'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                : 'text-secondary hover:text-primary'
            }`}
            title="Italiano"
          >
            🇮🇹 IT
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 text-xs font-semibold transition-all ${
              lang === 'en'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                : 'text-secondary hover:text-primary'
            }`}
            title="English"
          >
            🇬🇧 EN
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="glass rounded-xl px-3 py-1.5 text-sm transition-all hover:scale-105 active:scale-95"
          title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
          style={{ color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Admin link */}
        <a
          href="/admin"
          className="text-xs font-medium transition-colors flex items-center gap-1 glass rounded-xl px-3 py-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>🔐</span> Admin
        </a>
      </div>
    </nav>
  );
}
