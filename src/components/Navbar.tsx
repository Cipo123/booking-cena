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
            background: 'linear-gradient(135deg, #60a5fa, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          BookingCena
        </span>
      </a>

      {/* Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Language toggle */}
        <div className="flex rounded-xl overflow-hidden glass" style={{ border: '1px solid var(--card-border)' }}>
          <button
            onClick={() => setLang('it')}
            className={`px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all min-w-[40px] ${
              lang === 'it'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white'
                : 'text-secondary hover:text-primary'
            }`}
            title="Italiano"
          >
            🇮🇹 IT
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all min-w-[40px] ${
              lang === 'en'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white'
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
          className="glass rounded-xl px-2.5 sm:px-3 py-1.5 text-sm transition-all hover:scale-105 active:scale-95 min-w-[36px]"
          title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
          style={{ color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Admin link — only icon on xs screens */}
        <a
          href="/admin"
          className="text-xs font-medium transition-colors flex items-center gap-1 glass rounded-xl px-2.5 sm:px-3 py-1.5 min-w-[36px]"
          style={{ color: 'var(--text-muted)' }}
          title="Admin"
        >
          <span>🔐</span><span className="hidden sm:inline"> Admin</span>
        </a>
      </div>
    </nav>
  );
}
