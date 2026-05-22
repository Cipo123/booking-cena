'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Lang } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

/* ── Theme ─────────────────────────────────────────────────── */
type Theme = 'dark' | 'light';
interface ThemeCtx { theme: Theme; toggleTheme: () => void }
const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggleTheme: () => {} });

/* ── Language ───────────────────────────────────────────────── */
interface LangCtx { lang: Lang; setLang: (l: Lang) => void; tr: typeof translations.it }
const LangContext = createContext<LangCtx>({ lang: 'it', setLang: () => {}, tr: translations.it });

/* ── Toast ──────────────────────────────────────────────────── */
export interface Toast { id: number; message: string; type: 'success' | 'error' }
interface ToastCtx { showToast: (msg: string, type?: Toast['type']) => void }
const ToastContext = createContext<ToastCtx>({ showToast: () => {} });

let toastId = 0;

/* ── Combined Provider ──────────────────────────────────────── */
export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLangState] = useState<Lang>('it');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    const t = localStorage.getItem('bc-theme') as Theme | null;
    const l = localStorage.getItem('bc-lang') as Lang | null;
    if (t === 'light' || t === 'dark') setTheme(t);
    if (l === 'it' || l === 'en') setLangState(l);
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bc-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('bc-lang', l);
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastId;
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500);
  }, []);

  const tr = translations[lang] as typeof translations.it;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <LangContext.Provider value={{ lang, setLang, tr }}>
        <ToastContext.Provider value={{ showToast }}>
          {children}
          {/* Toast container */}
          <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
              <div
                key={toast.id}
                className={`
                  pointer-events-auto px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold
                  flex items-center gap-2 animate-fadeInUp
                  ${toast.type === 'success'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                    : 'bg-gradient-to-r from-rose-600 to-rose-500'}
                `}
              >
                <span>{toast.type === 'success' ? '✅' : '❌'}</span>
                {toast.message}
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export const useLang = () => useContext(LangContext);
export const useToast = () => useContext(ToastContext);
