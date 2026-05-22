'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useLang } from '@/context/providers';

export default function ShareQrWidget({ title }: { title: string }) {
  const { tr } = useLang();
  const [url, setUrl]       = useState('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => { setUrl(window.location.href); }, []);

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
        <span>🔗</span> {tr.event.share}
      </h3>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleShare}
          className="glass-strong rounded-xl px-4 py-2 text-sm flex items-center gap-2 transition-all hover:scale-105"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>📤</span> {tr.event.shareBtn}
        </button>
        <button
          onClick={handleCopy}
          className="glass-strong rounded-xl px-4 py-2 text-sm flex items-center gap-2 transition-all hover:scale-105"
          style={{ color: copied ? '#34d399' : 'var(--text-secondary)' }}
        >
          <span>{copied ? '✅' : '📋'}</span>
          {copied ? tr.event.copied : tr.event.copyLink}
        </button>
        <button
          onClick={() => setShowQr(v => !v)}
          className="glass-strong rounded-xl px-4 py-2 text-sm flex items-center gap-2 transition-all hover:scale-105"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>📱</span> {showQr ? tr.event.hideQr : tr.event.showQr}
        </button>
      </div>

      {showQr && url && (
        <div className="flex items-center gap-5 pt-1 animate-fadeInUp">
          <div className="rounded-xl bg-white p-3 shrink-0">
            <QRCode value={url} size={140} />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {tr.event.scanQr}
          </p>
        </div>
      )}
    </div>
  );
}
