'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EventPhoto } from '@/lib/db';

interface Props {
  eventId: string;
  lang: string;
}

async function downloadBlob(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    // fallback: open in new tab
    window.open(url, '_blank');
  }
}

function photoFilename(photo: EventPhoto, idx: number) {
  const ext = photo.url.split('.').pop()?.split('?')[0] ?? 'jpg';
  const safe = photo.uploader_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `foto_${String(idx + 1).padStart(2, '0')}_${safe}.${ext}`;
}

export default function PhotoWall({ eventId, lang }: Props) {
  const [photos, setPhotos]           = useState<EventPhoto[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number>(-1);
  const [uploading, setUploading]     = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [error, setError]             = useState('');
  const [noStorage, setNoStorage]     = useState(false);
  const [dlAll, setDlAll]             = useState(false);
  const [zoomed, setZoomed]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const fetchPhotos = () =>
    fetch(`/api/events/${eventId}/photos`)
      .then(r => r.json())
      .then(d => Array.isArray(d) && setPhotos(d));

  useEffect(() => { fetchPhotos(); }, [eventId]);

  const currentPhoto = lightboxIdx >= 0 ? photos[lightboxIdx] : null;
  const hasPrev = lightboxIdx > 0;
  const hasNext = lightboxIdx < photos.length - 1;

  const openLightbox = useCallback((idx: number) => {
    setLightboxIdx(idx);
    setZoomed(false);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIdx(-1);
    setZoomed(false);
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIdx(i => { if (i > 0) { setZoomed(false); return i - 1; } return i; });
  }, []);

  const goNext = useCallback(() => {
    setLightboxIdx(i => {
      if (i < photos.length - 1) { setZoomed(false); return i + 1; }
      return i;
    });
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIdx < 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      closeLightbox();
      if (e.key === 'ArrowLeft')   goPrev();
      if (e.key === 'ArrowRight')  goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, closeLightbox, goPrev, goNext]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (lightboxIdx < 0 || !thumbsRef.current) return;
    const el = thumbsRef.current.children[lightboxIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [lightboxIdx]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIdx >= 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIdx]);

  async function handleDownloadAll() {
    if (dlAll) return;
    setDlAll(true);
    for (let i = 0; i < photos.length; i++) {
      await downloadBlob(photos[i].url, photoFilename(photos[i], i));
      if (i < photos.length - 1) await new Promise(r => setTimeout(r, 400));
    }
    setDlAll(false);
  }

  async function handleUpload(file: File) {
    if (!uploaderName.trim()) {
      setError(lang === 'it' ? 'Inserisci il tuo nome prima di caricare' : 'Enter your name before uploading');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('uploader_name', uploaderName.trim());
      const res = await fetch(`/api/events/${eventId}/photos`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) { setNoStorage(true); return; }
        setError(data.error ?? 'Errore upload');
        return;
      }
      await fetchPhotos();
    } catch {
      setError(lang === 'it' ? 'Errore upload' : 'Upload error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (noStorage) {
    return (
      <div className="glass rounded-2xl p-5 text-center space-y-2">
        <div className="text-3xl">📦</div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {lang === 'it' ? 'Storage non configurato' : 'Storage not configured'}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {lang === 'it'
            ? 'Aggiungi SUPABASE_URL e SUPABASE_SERVICE_KEY nelle variabili d\'ambiente.'
            : 'Add SUPABASE_URL and SUPABASE_SERVICE_KEY to your environment variables.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
          <span>📸</span>
          {lang === 'it' ? `Galleria foto (${photos.length})` : `Photo gallery (${photos.length})`}
        </h3>
        {photos.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={dlAll}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl btn-primary text-white disabled:opacity-50 transition-opacity"
          >
            {dlAll
              ? <><span className="animate-spin inline-block">⏳</span> {lang === 'it' ? 'Scaricando…' : 'Downloading…'}</>
              : <><span>⬇️</span> {lang === 'it' ? 'Scarica tutte' : 'Download all'}</>
            }
          </button>
        )}
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => openLightbox(idx)}
              className="relative aspect-square rounded-xl overflow-hidden group"
              style={{ background: 'var(--card-bg)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.uploader_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end p-1.5">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate drop-shadow">
                  {p.uploader_name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>
          {lang === 'it' ? 'Nessuna foto ancora — carica la prima! 📷' : 'No photos yet — upload the first! 📷'}
        </p>
      )}

      {/* Upload section */}
      <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex gap-2">
          <input
            value={uploaderName}
            onChange={e => setUploaderName(e.target.value)}
            placeholder={lang === 'it' ? 'Il tuo nome' : 'Your name'}
            maxLength={60}
            className="flex-1"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary rounded-xl px-4 py-2 text-white font-semibold text-sm disabled:opacity-50 shrink-0 flex items-center gap-2"
          >
            {uploading ? <span className="animate-spin">⏳</span> : <span>📷</span>}
            {lang === 'it' ? 'Carica' : 'Upload'}
          </button>
        </div>
        {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
        />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Max 8 MB · JPEG, PNG, WebP, GIF
        </p>
      </div>

      {/* ── LIGHTBOX ─────────────────────────────────────────── */}
      {currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 overflow-hidden"
          style={{ animation: 'fadeIn .15s ease' }}
          onClick={closeLightbox}
        >
          {/* TOP BAR */}
          <div
            className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm"
            onClick={e => e.stopPropagation()}
          >
            {/* left: counter + info */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-white/60 text-xs font-mono shrink-0">
                {lightboxIdx + 1} / {photos.length}
              </span>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {currentPhoto.uploader_name}
                </p>
                <p className="text-white/40 text-xs">
                  {new Date(currentPhoto.created_at).toLocaleString(
                    lang === 'it' ? 'it-IT' : 'en-US',
                    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                  )}
                </p>
              </div>
            </div>

            {/* right: download + close */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => downloadBlob(currentPhoto.url, photoFilename(currentPhoto, lightboxIdx))}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              >
                ⬇️ {lang === 'it' ? 'Scarica' : 'Download'}
              </button>
              <button
                onClick={closeLightbox}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* MAIN IMAGE — altezza calcolata rispetto alla viewport */}
          <div
            className="flex items-center justify-center relative px-14 w-full"
            style={{ height: 'calc(100vh - 11rem)' }}
          >
            {/* Prev */}
            {hasPrev && (
              <button
                onClick={e => { e.stopPropagation(); goPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white text-2xl flex items-center justify-center transition-colors select-none"
              >
                ‹
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentPhoto.id}
              src={currentPhoto.url}
              alt={currentPhoto.uploader_name}
              onClick={e => { e.stopPropagation(); setZoomed(z => !z); }}
              style={{
                maxWidth: 'calc(100vw - 7rem)',
                maxHeight: zoomed ? 'none' : 'calc(100vh - 11rem)',
                width: 'auto',
                height: 'auto',
              }}
              className={`rounded-xl shadow-2xl transition-all duration-200 select-none object-contain ${
                zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
              }`}
            />

            {/* Next */}
            {hasNext && (
              <button
                onClick={e => { e.stopPropagation(); goNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white text-2xl flex items-center justify-center transition-colors select-none"
              >
                ›
              </button>
            )}
          </div>

          {/* THUMBNAIL STRIP */}
          <div
            ref={thumbsRef}
            className="shrink-0 flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
            onClick={e => e.stopPropagation()}
            style={{ scrollbarWidth: 'none' }}
          >
            {photos.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => openLightbox(idx)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                  idx === lightboxIdx
                    ? 'border-white scale-105 opacity-100'
                    : 'border-transparent opacity-40 hover:opacity-75'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.uploader_name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Hint */}
          <p className="shrink-0 text-center text-white/25 text-xs pb-2 select-none">
            {lang === 'it'
              ? '← → naviga · ESC chiudi · click sull\'immagine per zoom'
              : '← → navigate · ESC close · click image to zoom'}
          </p>
        </div>
      )}
    </div>
  );
}
