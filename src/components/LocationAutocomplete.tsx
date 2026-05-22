'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlaceSuggestion } from '@/app/api/places/route';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}

export default function LocationAutocomplete({ value, onChange, placeholder, required, maxLength }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal query when parent resets the value (e.g. form clear)
  useEffect(() => { setQuery(value); }, [value]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return;
      const data: PlaceSuggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // keep parent in sync while typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  }

  function selectSuggestion(s: PlaceSuggestion) {
    setQuery(s.fullText);
    onChange(s.fullText);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          e.preventDefault();
          selectSuggestion(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  }

  // Close when clicking outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength ?? 200}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}
            />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              type="button"
              onMouseDown={() => selectSuggestion(s)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                i === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'
              } ${i < suggestions.length - 1 ? 'border-b' : ''}`}
              style={i < suggestions.length - 1 ? { borderColor: 'var(--card-border)' } : {}}
            >
              <span className="text-base shrink-0 mt-0.5">📍</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  {s.mainText}
                </p>
                {s.secondaryText && (
                  <p className="text-xs leading-tight truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {s.secondaryText}
                  </p>
                )}
              </div>
            </button>
          ))}
          {/* Branding required by Google TOS */}
          <div
            className="flex items-center justify-end px-3 py-1.5"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>powered by Google</span>
          </div>
        </div>
      )}
    </div>
  );
}
