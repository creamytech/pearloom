'use client';

// Renders the Stamp postmark across tones / papers / sizes so a
// design pass can be verified at a glance. Mirrors real call sites:
// the Studio card's motif overlay (size 70), the dashboard chrome
// (72), the rails' mini previews (28/20).
import { Stamp } from '@/components/pearloom/motifs';

const PAPERS = [
  { id: 'cream', name: 'Cream paper', bg: '#FDFAF0', ink: '#3D4A1F' },
  { id: 'letterpress', name: 'Letterpress', bg: '#F8F1E4', ink: '#3D4A1F' },
  { id: 'twilight', name: 'Twilight (dark)', bg: '#1F2236', ink: '#F8F1E4' },
] as const;

const TONES = ['lavender', 'peach', 'sage', 'cream'] as const;

export function DevMarksClient() {
  return (
    <main style={{ padding: 40, background: '#EFE9DA', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>Marks — Stamp postmark</h1>
      <p style={{ fontSize: 13, color: '#6B6353', marginBottom: 24 }}>
        Ink rings on bare paper. Tones pick the ink; the paper always shows through.
      </p>
      {PAPERS.map((paper) => (
        <section
          key={paper.id}
          style={{
            background: paper.bg,
            borderRadius: 8,
            padding: 28,
            marginBottom: 20,
            border: '1px solid rgba(61,54,38,0.14)',
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: paper.ink, opacity: 0.6, marginBottom: 18 }}>
            {paper.name}
          </div>
          <div style={{ display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap' }}>
            {TONES.map((tone) => (
              <Stamp
                key={tone}
                size={100}
                tone={tone}
                text="Save the date"
                icon="heart"
                rotation={-6}
                inkColor={paper.id === 'twilight' ? '#C4B5D9' : undefined}
              />
            ))}
            <Stamp
              size={70}
              tone="sage"
              text="With gratitude"
              icon="pear"
              rotation={8}
              inkColor={paper.id === 'twilight' ? '#C4B5D9' : undefined}
            />
            <Stamp
              size={70}
              tone="peach"
              text="In memory"
              icon="sparkle"
              rotation={0}
              inkColor={paper.id === 'twilight' ? '#C4B5D9' : undefined}
            />
            <Stamp
              size={28}
              tone="lavender"
              text="Save the date"
              icon="heart"
              rotation={0}
              inkColor={paper.id === 'twilight' ? '#C4B5D9' : undefined}
            />
          </div>
        </section>
      ))}
    </main>
  );
}
