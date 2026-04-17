'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/wizard/PhotoFirstWizard.tsx
//
// Drop a folder of photos → full skeleton site in ~30 s.
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { StoryManifest } from '@/types';

type Phase = 'idle' | 'reading' | 'analyzing' | 'done' | 'error';

const CREAM = 'var(--pl-cream, #F5EFE2)';
const CREAM_CARD = 'var(--pl-cream-card, #FBF7EE)';
const INK = 'var(--pl-ink, #0E0D0B)';
const INK_SOFT = 'var(--pl-ink-soft, #3A332C)';
const MUTED = 'var(--pl-muted, #6F6557)';
const GOLD = 'var(--pl-gold, #B8935A)';
const GOLD_RULE = 'color-mix(in oklab, var(--pl-gold, #B8935A) 35%, transparent)';
const OLIVE = 'var(--pl-olive, #5C6B3F)';
const CRIMSON = 'var(--pl-plum, #7A2D2D)';

const FONT_DISPLAY = 'var(--pl-font-heading, "Fraunces", Georgia, serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, monospace)';

interface ResultStats {
  photosProcessed: number;
  chapters: number;
  dateGuess: string | null;
  venueGuess: string | null;
  palette: string;
}

export function PhotoFirstWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ResultStats | null>(null);
  const [manifest, setManifest] = useState<StoryManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList) {
    if (files.length < 2) {
      setError('Pick at least 2 photos so Pear has something to work with.');
      setPhase('error');
      return;
    }
    setPhase('reading');
    setProgress(0);
    setError(null);

    const photos: Array<{ url: string; name: string }> = [];
    const cap = Math.min(files.length, 50);
    for (let i = 0; i < cap; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const compressed = await compressForUpload(file);
      photos.push({ url: compressed, name: file.name });
      setProgress(Math.round(((i + 1) / cap) * 60)); // 0–60% is read phase
    }

    setPhase('analyzing');
    try {
      const res = await fetch('/api/wizard/photo-first', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos }),
      });
      setProgress(90);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Analyze failed');
      }
      const data = (await res.json()) as {
        manifest: StoryManifest;
        stats: ResultStats;
      };
      setManifest(data.manifest);
      setResult(data.stats);
      setProgress(100);
      setPhase('done');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong.');
      setPhase('error');
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }

  async function commitAndContinue() {
    if (!manifest) return;
    // Store the drafted manifest in sessionStorage so the normal wizard
    // flow can pick it up and let the user refine names / date / etc.
    try {
      sessionStorage.setItem(
        'pearloom.photo-first.draft',
        JSON.stringify(manifest),
      );
    } catch {
      /* ignore */
    }
    router.push('/?source=photo-first');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: CREAM,
        color: INK,
        fontFamily: 'var(--pl-font-body, system-ui)',
        padding: 'clamp(24px, 5vw, 72px) clamp(20px, 5vw, 48px)',
      }}
    >
      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <header style={{ textAlign: 'center', marginBottom: 40 }}>
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: '0.62rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: GOLD,
              margin: '0 0 14px',
            }}
          >
            Photo-first · skip the questions
          </p>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 5vw, 2.8rem)',
              lineHeight: 1.1,
              color: INK,
              margin: '0 0 14px',
              letterSpacing: '-0.014em',
            }}
          >
            Drop your photos. Pear does the rest.
          </h1>
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontSize: 'clamp(0.98rem, 2vw, 1.12rem)',
              color: INK_SOFT,
              lineHeight: 1.5,
              margin: 0,
              maxWidth: 540,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Upload 10-50 engagement photos. Pearloom reads the dates, locations,
            and colors to auto-build your chapters, palette, and venue guess in
            about 30 seconds.
          </p>
        </header>

        {phase === 'idle' || phase === 'error' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              padding: 'clamp(32px, 6vw, 72px) 24px',
              border: `2px dashed ${dragOver ? OLIVE : GOLD_RULE}`,
              borderRadius: 6,
              background: dragOver
                ? 'color-mix(in oklab, var(--pl-olive, #5C6B3F) 10%, transparent)'
                : CREAM_CARD,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: '0.66rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: MUTED,
                marginBottom: 14,
              }}
            >
              {dragOver ? 'Drop to start' : 'Drop photos here'}
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: '1.8rem',
                color: INK,
                lineHeight: 1.1,
                margin: '0 0 12px',
              }}
            >
              or click to choose a folder
            </div>
            <p
              style={{
                fontSize: '0.88rem',
                color: MUTED,
                margin: '0 0 20px',
              }}
            >
              JPG, PNG, HEIC · Up to 50 at once
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{
                padding: '12px 24px',
                background: INK,
                color: CREAM,
                border: 'none',
                borderRadius: 2,
                fontFamily: FONT_MONO,
                fontSize: '0.66rem',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Choose photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            {error && (
              <p
                style={{
                  marginTop: 18,
                  color: CRIMSON,
                  fontSize: '0.88rem',
                }}
              >
                {error}
              </p>
            )}
          </div>
        ) : phase === 'reading' || phase === 'analyzing' ? (
          <AnalyzingCard progress={progress} phase={phase} />
        ) : result && manifest ? (
          <ResultCard result={result} onContinue={commitAndContinue} />
        ) : null}

        <p
          style={{
            marginTop: 32,
            textAlign: 'center',
            fontFamily: FONT_MONO,
            fontSize: '0.58rem',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          Prefer answering questions?{' '}
          <a
            href="/"
            style={{
              color: GOLD,
              textDecoration: 'underline',
              textUnderlineOffset: 4,
            }}
          >
            Classic wizard →
          </a>
        </p>
      </main>
    </div>
  );
}

function AnalyzingCard({ progress, phase }: { progress: number; phase: Phase }) {
  const label =
    phase === 'reading' ? 'Reading EXIF + colors…' : 'Clustering chapters + picking a palette…';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '48px 32px',
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 6,
        background: CREAM_CARD,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.62rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: GOLD,
          margin: '0 0 16px',
        }}
      >
        {label}
      </p>
      <div
        style={{
          height: 3,
          background: 'color-mix(in oklab, var(--pl-gold, #B8935A) 20%, transparent)',
          borderRadius: 999,
          overflow: 'hidden',
          margin: '0 auto',
          maxWidth: 360,
        }}
      >
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
          style={{
            height: '100%',
            background: 'var(--pl-olive, #5C6B3F)',
            borderRadius: 999,
          }}
        />
      </div>
      <p
        style={{
          marginTop: 20,
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          color: INK_SOFT,
          fontSize: '1rem',
        }}
      >
        Usually takes 20-40 seconds.
      </p>
    </motion.div>
  );
}

function ResultCard({
  result,
  onContinue,
}: {
  result: ResultStats;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 'clamp(28px, 5vw, 48px)',
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 6,
        background: CREAM_CARD,
      }}
    >
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.62rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: OLIVE,
          margin: '0 0 14px',
        }}
      >
        ✓ Your site is drafted
      </p>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
          color: INK,
          margin: '0 0 20px',
          letterSpacing: '-0.012em',
          lineHeight: 1.15,
        }}
      >
        Here&rsquo;s what Pear found.
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 0,
          padding: '20px 0',
          borderTop: `1px solid ${GOLD_RULE}`,
          borderBottom: `1px solid ${GOLD_RULE}`,
          margin: '0 0 28px',
        }}
      >
        <Stat label="Photos" value={String(result.photosProcessed)} />
        <Stat label="Chapters" value={String(result.chapters)} divider />
        <Stat label="Palette" value={result.palette} divider />
      </div>

      {result.dateGuess && (
        <Row label="Likely date" value={new Date(result.dateGuess).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })} />
      )}
      {result.venueGuess && <Row label="Likely place" value={result.venueGuess} />}

      <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onContinue}
          style={{
            flex: 1,
            padding: '14px 24px',
            background: INK,
            color: CREAM,
            border: 'none',
            borderRadius: 2,
            fontFamily: FONT_MONO,
            fontSize: '0.66rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Refine + publish →
        </button>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '0 16px',
        borderLeft: divider ? `1px solid ${GOLD_RULE}` : 'none',
      }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontSize: 'clamp(1.3rem, 3vw, 1.7rem)',
          color: INK,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.56rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: MUTED,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: `1px solid ${GOLD_RULE}`,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.6rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: MUTED,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontSize: '1.05rem',
          color: INK,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// Compress a large image to ~800px max dimension to keep payload small.
async function compressForUpload(file: File): Promise<string> {
  if (file.size < 300 * 1024) {
    // Small enough to send as-is.
    return await fileToDataUrl(file);
  }
  const img = await loadImage(file);
  const maxDim = 1200;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return await fileToDataUrl(file);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.84);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}
