'use client';

// ─────────────────────────────────────────────────────────────
// Client-side interactive cards that live on the Guest Passport
// below the original hero / chapter / seat / voice-toast stack:
//   • Memory Prompt card (if the host has generated one)
//   • Seat-mate Intro card (if seat intros have been generated)
//   • Live Whisper composer (private, slow-delivered note)
//   • Anniversary Time-Capsule composer (sealed, year-revealed)
//   • Song Request composer (collaborative playlist)
//
// All four interactive composers post to /api/guest-passport/[token]/submit.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

interface PassportData {
  guest?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    homeCity?: string | null;
    dietary?: string[] | null;
    language?: string | null;
  } | null;
  site?: {
    domain: string;
    names?: string[];
    manifest?: {
      logistics?: { date?: string | null; time?: string | null; venue?: string | null };
    } | null;
  } | null;
  memoryPrompt?: { id: string; prompt: string; response?: string | null; respondedAt?: string | null } | null;
  whisper?: { id: string; body: string; created_at: string } | null;
  timeCapsule?: { id: string; body: string; reveal_years: number; reveal_on: string } | null;
  songs?: Array<{ id: string; song_title: string; artist?: string | null; created_at: string }>;
  seatIntro?: { table_label?: string | null; intro: string; seatmates: Array<{ name: string; blurb?: string }> } | null;
}

export function PassportSections({
  token,
  accent,
  headingFont,
  occasion,
}: {
  token: string;
  accent: string;
  headingFont: string;
  occasion?: string | null;
}) {
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/guest-passport/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setData(d ?? null);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading || !data) return null;

  const isSolemn = occasion === 'memorial' || occasion === 'funeral';
  const eventIso = data.site?.manifest?.logistics?.date ?? null;
  const eventTime = data.site?.manifest?.logistics?.time ?? null;
  const eventVenue = data.site?.manifest?.logistics?.venue ?? null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 20,
        padding: '0 1.5rem 4rem',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      {eventIso && (
        <CountdownCard iso={eventIso} time={eventTime} venue={eventVenue} accent={accent} headingFont={headingFont} />
      )}

      {data.seatIntro && (
        <SeatIntroCard intro={data.seatIntro} headingFont={headingFont} accent={accent} />
      )}

      {data.memoryPrompt && (
        <MemoryPromptCard
          token={token}
          initial={data.memoryPrompt}
          headingFont={headingFont}
          accent={accent}
          occasion={occasion}
        />
      )}

      <WhisperCard
        token={token}
        initial={data.whisper}
        headingFont={headingFont}
        accent={accent}
        isSolemn={isSolemn}
      />

      <CapsuleCard
        token={token}
        initial={data.timeCapsule}
        headingFont={headingFont}
        accent={accent}
        isSolemn={isSolemn}
      />

      {!isSolemn && (
        <SongCard
          token={token}
          initial={data.songs ?? []}
          headingFont={headingFont}
          accent={accent}
        />
      )}
    </div>
  );
}

function Card({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      style={{
        padding: '1.5rem',
        background: '#FBF7EE',
        border: `1px solid ${accent}22`,
        borderRadius: 16,
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ label, accent }: { label: string; accent: string }) {
  return (
    <div
      style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: accent,
        marginBottom: 8,
      }}
    >
      {label}
    </div>
  );
}

function Title({ text, headingFont }: { text: string; headingFont: string }) {
  return (
    <h2
      style={{
        fontFamily: headingFont,
        fontSize: '1.4rem',
        margin: 0,
        letterSpacing: '-0.01em',
        fontWeight: 500,
      }}
    >
      {text}
    </h2>
  );
}

// ── Seat Intro ──
// ── Countdown ──
function CountdownCard({
  iso,
  time,
  venue,
  accent,
  headingFont,
}: {
  iso: string;
  time?: string | null;
  venue?: string | null;
  accent: string;
  headingFont: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(iso).getTime();
  if (Number.isNaN(target) || now === null) return null;
  const diffMs = target - now;
  if (diffMs <= 0) {
    // Event has happened — show a "today/past" label instead of a
    // countdown. Useful for post-event passport views.
    return (
      <Card accent={accent}>
        <Eyebrow label="The day" accent={accent} />
        <Title text="Thank you for being there" headingFont={headingFont} />
        <p style={{ fontSize: '0.92rem', lineHeight: 1.55, margin: '8px 0 0', color: '#6F6557' }}>
          {new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          {venue ? ` · ${venue}` : ''}
        </p>
      </Card>
    );
  }

  const days = Math.floor(diffMs / 86_400_000);
  const hrs = Math.floor((diffMs % 86_400_000) / 3_600_000);
  const min = Math.floor((diffMs % 3_600_000) / 60_000);
  const cells = [
    { n: days, l: 'days' },
    { n: hrs, l: 'hrs' },
    { n: min, l: 'min' },
  ];

  return (
    <Card accent={accent}>
      <Eyebrow label="Until the day" accent={accent} />
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 18,
          marginTop: 6,
        }}
      >
        {cells.map((c, i) => (
          <div key={c.l} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: headingFont,
                  fontSize: 34,
                  lineHeight: 1,
                  fontWeight: 600,
                  color: accent,
                }}
              >
                {c.n}
              </span>
              <span style={{ fontSize: 10, color: '#6F6557', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
                {c.l}
              </span>
            </div>
            {i < cells.length - 1 && <span style={{ color: '#D8CFB8', fontSize: 22 }}>:</span>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.88rem', color: '#3A332C', marginTop: 14 }}>
        {new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        {time ? ` · ${time}` : ''}
        {venue ? ` · ${venue}` : ''}
      </div>
    </Card>
  );
}

function SeatIntroCard({
  intro,
  headingFont,
  accent,
}: {
  intro: { table_label?: string | null; intro: string; seatmates: Array<{ name: string; blurb?: string }> };
  headingFont: string;
  accent: string;
}) {
  return (
    <Card accent={accent}>
      <Eyebrow label={intro.table_label ? `Your table · ${intro.table_label}` : 'Your table'} accent={accent} />
      <Title text="Who you'll sit with" headingFont={headingFont} />
      <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '10px 0 14px', color: '#3A332C' }}>{intro.intro}</p>
      {Array.isArray(intro.seatmates) && intro.seatmates.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {intro.seatmates.map((m, i) => (
            <li
              key={i}
              style={{
                padding: '8px 12px',
                background: '#fff',
                borderRadius: 10,
                fontSize: '0.88rem',
                border: `1px solid ${accent}22`,
              }}
            >
              <strong>{m.name}</strong>
              {m.blurb && <span style={{ color: '#6F6557' }}> — {m.blurb}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Memory Prompt ──
function MemoryPromptCard({
  token,
  initial,
  headingFont,
  accent,
  occasion,
}: {
  token: string;
  initial: { id: string; prompt: string; response?: string | null };
  headingFont: string;
  accent: string;
  occasion?: string | null;
}) {
  const [value, setValue] = useState(initial.response ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const isSolemn = occasion === 'memorial' || occasion === 'funeral';

  async function save() {
    const text = value.trim();
    if (!text) return;
    setState('saving');
    setErr(null);
    try {
      const r = await fetch(`/api/guest-passport/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'memory', response: text }),
      });
      if (!r.ok) throw new Error(`(${r.status})`);
      setState('saved');
    } catch (e) {
      setState('error');
      setErr(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  return (
    <Card accent={accent}>
      <Eyebrow label={isSolemn ? 'A memory request' : 'A story they asked for'} accent={accent} />
      <Title text={isSolemn ? 'Share a memory' : 'Tell them a story'} headingFont={headingFont} />
      <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '10px 0 12px', color: '#3A332C', fontStyle: 'italic' }}>
        {initial.prompt}
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="A paragraph — whatever comes to mind. Pear weaves the best lines into the toast."
        rows={5}
        style={{
          width: '100%',
          padding: 12,
          borderRadius: 10,
          border: `1px solid ${accent}33`,
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          background: '#fff',
          boxSizing: 'border-box',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!value.trim() || state === 'saving'}
          style={{
            padding: '10px 16px',
            borderRadius: 999,
            background: accent,
            color: '#F5EFE2',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            opacity: !value.trim() || state === 'saving' ? 0.5 : 1,
          }}
        >
          {state === 'saving' ? 'Sending…' : state === 'saved' ? 'Thank you' : 'Send it'}
        </button>
        {state === 'saved' && <span style={{ fontSize: '0.82rem', color: '#6F6557' }}>They'll read it soon.</span>}
        {state === 'error' && <span style={{ fontSize: '0.82rem', color: '#7A2D2D' }}>{err}</span>}
      </div>
    </Card>
  );
}

// ── Whisper ──
function WhisperCard({
  token,
  initial,
  headingFont,
  accent,
  isSolemn,
}: {
  token: string;
  initial: { id: string; body: string; created_at: string } | null | undefined;
  headingFont: string;
  accent: string;
  isSolemn: boolean;
}) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(initial ? 'saved' : 'idle');
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const text = value.trim();
    if (!text) return;
    setState('saving');
    setErr(null);
    try {
      const r = await fetch(`/api/guest-passport/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'whisper', body: text }),
      });
      if (!r.ok) throw new Error(`(${r.status})`);
      setValue('');
      setState('saved');
    } catch (e) {
      setState('error');
      setErr(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  return (
    <Card accent={accent}>
      <Eyebrow label={isSolemn ? 'A private note' : 'A whisper, just for them'} accent={accent} />
      <Title text="Leave a note" headingFont={headingFont} />
      <p style={{ fontSize: '0.92rem', lineHeight: 1.55, margin: '10px 0 12px', color: '#6F6557' }}>
        Only the {isSolemn ? 'family' : 'couple'} will read this. Pear delivers each whisper over the next two weeks
        — a slow drip of warmth instead of a firehose.
      </p>
      {state === 'saved' && !value ? (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: `${accent}15`,
            fontSize: '0.9rem',
            color: '#3A332C',
            border: `1px dashed ${accent}44`,
          }}
        >
          Thank you — your whisper is on its way. You can leave another if you'd like.
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setState('idle')}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: 'transparent',
                border: `1px solid ${accent}`,
                color: accent,
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Write another
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Whatever you want them to hear, quietly."
            rows={4}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${accent}33`,
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              background: '#fff',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!value.trim() || state === 'saving'}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                background: accent,
                color: '#F5EFE2',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: !value.trim() || state === 'saving' ? 0.5 : 1,
              }}
            >
              {state === 'saving' ? 'Sending…' : 'Send whisper'}
            </button>
            {state === 'error' && <span style={{ fontSize: '0.82rem', color: '#7A2D2D' }}>{err}</span>}
          </div>
        </>
      )}
    </Card>
  );
}

// ── Time Capsule ──
function CapsuleCard({
  token,
  initial,
  headingFont,
  accent,
  isSolemn,
}: {
  token: string;
  initial: { id: string; body: string; reveal_years: number; reveal_on: string } | null | undefined;
  headingFont: string;
  accent: string;
  isSolemn: boolean;
}) {
  const [value, setValue] = useState('');
  const [years, setYears] = useState(1);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(initial ? 'saved' : 'idle');
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const text = value.trim();
    if (!text) return;
    setState('saving');
    setErr(null);
    try {
      const r = await fetch(`/api/guest-passport/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'capsule', body: text, years }),
      });
      if (!r.ok) throw new Error(`(${r.status})`);
      setState('saved');
    } catch (e) {
      setState('error');
      setErr(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  if (state === 'saved' && initial) {
    return (
      <Card accent={accent}>
        <Eyebrow label={`Sealed · opens ${new Date(initial.reveal_on).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`} accent={accent} />
        <Title text="Your time-capsule note" headingFont={headingFont} />
        <p style={{ fontSize: '0.92rem', lineHeight: 1.55, margin: '10px 0 0', color: '#6F6557', fontStyle: 'italic' }}>
          Pear will deliver this on year {initial.reveal_years}. Future them will be glad you wrote.
        </p>
      </Card>
    );
  }

  return (
    <Card accent={accent}>
      <Eyebrow label={isSolemn ? 'For remembrance' : 'For a future anniversary'} accent={accent} />
      <Title text="A time-capsule note" headingFont={headingFont} />
      <p style={{ fontSize: '0.92rem', lineHeight: 1.55, margin: '10px 0 12px', color: '#6F6557' }}>
        Write something for future them. Pear seals it now and delivers on the {isSolemn ? 'remembrance' : 'anniversary'} year you pick.
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[1, 5, 10, 25].map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYears(y)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: years === y ? accent : 'transparent',
              color: years === y ? '#F5EFE2' : '#3A332C',
              border: years === y ? 'none' : `1px solid ${accent}44`,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Year {y}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Advice, a prediction, or just a wish."
        rows={4}
        style={{
          width: '100%',
          padding: 12,
          borderRadius: 10,
          border: `1px solid ${accent}33`,
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          background: '#fff',
          boxSizing: 'border-box',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!value.trim() || state === 'saving'}
          style={{
            padding: '10px 16px',
            borderRadius: 999,
            background: accent,
            color: '#F5EFE2',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            opacity: !value.trim() || state === 'saving' ? 0.5 : 1,
          }}
        >
          {state === 'saving' ? 'Sealing…' : 'Seal it'}
        </button>
        {state === 'error' && <span style={{ fontSize: '0.82rem', color: '#7A2D2D' }}>{err}</span>}
      </div>
    </Card>
  );
}

// ── Song Request ──
function SongCard({
  token,
  initial,
  headingFont,
  accent,
}: {
  token: string;
  initial: Array<{ id: string; song_title: string; artist?: string | null; created_at: string }>;
  headingFont: string;
  accent: string;
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [songs, setSongs] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const t = title.trim();
    if (!t) return;
    setState('saving');
    setErr(null);
    try {
      const r = await fetch(`/api/guest-passport/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'song', title: t, artist: artist.trim() || null }),
      });
      if (!r.ok) throw new Error(`(${r.status})`);
      setSongs((s) => [
        { id: `tmp-${Date.now()}`, song_title: t, artist: artist.trim() || null, created_at: new Date().toISOString() },
        ...s,
      ]);
      setTitle('');
      setArtist('');
      setState('idle');
    } catch (e) {
      setState('error');
      setErr(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  return (
    <Card accent={accent}>
      <Eyebrow label="Shared playlist" accent={accent} />
      <Title text="Add a song" headingFont={headingFont} />
      <p style={{ fontSize: '0.92rem', lineHeight: 1.55, margin: '10px 0 12px', color: '#6F6557' }}>
        A song that would make you dance. Yours joins the crowd's mix for cocktail hour.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 10 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Song title"
          style={{
            padding: 10,
            borderRadius: 10,
            border: `1px solid ${accent}33`,
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            background: '#fff',
          }}
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          style={{
            padding: 10,
            borderRadius: 10,
            border: `1px solid ${accent}33`,
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            background: '#fff',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!title.trim() || state === 'saving'}
          style={{
            padding: '10px 16px',
            borderRadius: 999,
            background: accent,
            color: '#F5EFE2',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            opacity: !title.trim() || state === 'saving' ? 0.5 : 1,
          }}
        >
          {state === 'saving' ? 'Adding…' : 'Add to playlist'}
        </button>
        {state === 'error' && <span style={{ fontSize: '0.82rem', color: '#7A2D2D' }}>{err}</span>}
      </div>
      {songs.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 6 }}>
          {songs.map((s) => (
            <li
              key={s.id}
              style={{
                padding: '8px 12px',
                background: '#fff',
                borderRadius: 8,
                fontSize: '0.88rem',
                border: `1px solid ${accent}22`,
              }}
            >
              <strong>{s.song_title}</strong>
              {s.artist && <span style={{ color: '#6F6557' }}> · {s.artist}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
