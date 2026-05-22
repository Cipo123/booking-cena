'use client';

import { useEffect, useRef, useState } from 'react';
import type { EventPhoto } from '@/lib/db';

interface Props {
  eventId: string;
  lang: string;
}

export default function PhotoWall({ eventId, lang }: Props) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [error, setError] = useState('');
  const [noStorage, setNoStorage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = () =>
    fetch(`/api/events/${eventId}/photos`)
      .then(r => r.json())
      .then(d => Array.isArray(d) && setPhotos(d));

  useEffect(() => { fetchPhotos(); }, [eventId]);

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
            ? 'Aggiungi BLOB_READ_WRITE_TOKEN per abilitare i caricamenti foto.'
            : 'Add BLOB_READ_WRITE_TOKEN to enable photo uploads.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
        <span>📸</span>
        {lang === 'it' ? `Galleria foto (${photos.length})` : `Photo gallery (${photos.length})`}
      </h3>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map(p => (
            <button
              key={p.id}
              onClick={() => setLightbox(p.url)}
              className="relative aspect-square rounded-xl overflow-hidden group"
              style={{ background: 'var(--card-bg)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.uploader_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end p-1.5">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate">
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
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {lang === 'it' ? 'Max 8 MB · JPEG, PNG, WebP, GIF' : 'Max 8 MB · JPEG, PNG, WebP, GIF'}
        </p>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 animate-fadeIn"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:opacity-70"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="foto"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
