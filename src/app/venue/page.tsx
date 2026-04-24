'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/venue/page.tsx
// Venue intake page — search Google Places or fill in manually
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Building2, Sparkles, Loader2 } from 'lucide-react';
import { VenueSearch, type VenuePartial } from '@/components/venue/VenueSearch';
import { VenueProfile, type VenueData } from '@/components/venue/VenueProfile';
import { TopNav } from '@/components/pearloom/chrome';

// ─────────────────────────────────────────────────────────────

function venuePartialToData(v: VenuePartial): VenueData {
  return {
    placeId: v.placeId,
    name: v.name,
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    websiteUri: v.websiteUri,
    phone: v.phone,
    types: v.types,
  };
}

// ─────────────────────────────────────────────────────────────

export default function VenuePage() {
  const { data: session, status } = useSession();
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [savedVenueId, setSavedVenueId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addManually, setAddManually] = useState(false);

  // ── Load saved venue on mount ────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    // We don't have a siteId tied to the user here (multi-site architecture).
    // Use the email as a best-effort siteId for demo purposes.
    const siteId = session?.user?.email ?? 'unknown';

    fetch(`/api/venue?siteId=${encodeURIComponent(siteId)}`)
      .then(r => r.json())
      .then((data: { venues?: VenueData[] }) => {
        const first = data.venues?.[0] as (VenueData & { id?: string }) | undefined;
        if (first) {
          const { id, ...rest } = first;
          setSavedVenueId(id ?? null);
          setVenue(rest);
        }
      })
      .catch(err => console.error('[VenuePage] load error:', err))
      .finally(() => setIsLoading(false));
  }, [status, session]);

  // ── Auth guard ───────────────────────────────────────────
  if (status === 'loading' || isLoading) {
    return (
      <div
        className="pl8"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--cream)',
        }}
      >
        <Loader2 size={32} style={{ color: 'var(--sage-deep)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div
        className="pl8"
        style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative' }}
      >
        <TopNav active="Venues" />
        <div
          style={{
            maxWidth: 880,
            margin: '0 auto',
            padding: '72px 32px 96px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(61,74,31,0.12)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              marginBottom: 24,
            }}
          >
            <Sparkles size={12} /> For venues & event spaces
          </div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: '0 0 18px', lineHeight: 1.02 }}
          >
            Get discovered by the couples <span className="display-italic">using Pearloom.</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: 'var(--ink-soft)',
              maxWidth: 560,
              margin: '0 auto 32px',
              lineHeight: 1.55,
            }}
          >
            List your venue once and appear inside every Pearloom wedding wizard
            that searches your region — with your photos, contact details, and the
            warm context a couple actually reads.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <button
              onClick={() => signIn('google')}
              className="btn btn-primary btn-lg"
            >
              Sign in with Google
            </button>
            <Link href="/" className="btn btn-outline btn-lg">
              Back to Pearloom
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              maxWidth: 640,
              margin: '0 auto',
            }}
          >
            {[
              { n: '$0', label: 'To list' },
              { n: 'Verified', label: 'Google Places' },
              { n: '24h', label: 'Setup' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: '#fff',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div className="display" style={{ fontSize: 22, margin: 0 }}>{s.n}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Save handler ─────────────────────────────────────────
  const handleSave = async () => {
    if (!venue) return;
    const siteId = session?.user?.email ?? 'unknown';
    setIsSaving(true);
    setSaveMsg(null);

    try {
      let res: Response;
      if (savedVenueId) {
        res = await fetch('/api/venue', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: savedVenueId, ...venue }),
        });
      } else {
        res = await fetch('/api/venue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, ...venue }),
        });
      }

      const data = await res.json() as { venue?: VenueData & { id?: string } };
      if (data.venue?.id) setSavedVenueId(data.venue.id);
      setSaveMsg('Venue saved!');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      console.error('[VenuePage] save error:', err);
      setSaveMsg('Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Empty state: show search ─────────────────────────────
  const showSearch = !venue && !addManually;
  const showManual = !venue && addManually;

  return (
    <div
      className="pl8"
      style={{
        minHeight: '100vh',
        background: 'var(--cream)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* ── Page header ─────────────────────────────────── */}
      <header
        style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #EAE3D0',
          background: '#FEFCF8',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: '#8B774B',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '0.375rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #D4C9B0',
            background: 'transparent',
            transition: 'background var(--pl-dur-instant)',
          }}
        >
          <ArrowLeft size={15} />
          Dashboard
        </Link>

        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#2C2416',
              margin: 0,
            }}
          >
            Your Venue
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#9A8F7B', marginTop: '0.125rem' }}>
            Search for your venue or fill in the details manually
          </p>
        </div>

        {saveMsg && (
          <div
            style={{
              padding: '0.5rem 1rem',
              background: saveMsg.includes('failed') ? '#FEE2E2' : '#D1FAE5',
              color: saveMsg.includes('failed') ? '#991B1B' : '#065F46',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {saveMsg}
          </div>
        )}
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* ── Empty: search UI ──────────────────────────── */}
        {showSearch && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: '2.5rem',
            }}
          >
            {/* Illustration placeholder */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F0EAD8 0%, #E6DBC4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 20px rgba(139,119,75,0.15)',
              }}
            >
              <Building2 size={40} style={{ color: '#8B774B' }} />
            </div>

            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#2C2416',
                margin: '0 0 0.75rem',
              }}
            >
              Where&apos;s your celebration?
            </h2>
            <p style={{ color: '#9A8F7B', fontSize: '1rem', margin: '0 0 2rem', maxWidth: 420 }}>
              Search for your venue to auto-fill details, or add everything manually.
            </p>

            <div style={{ width: '100%', maxWidth: 520 }}>
              <VenueSearch
                onSelect={partial => {
                  setVenue(venuePartialToData(partial));
                }}
                onAddManually={() => setAddManually(true)}
                placeholder="Search venues — e.g. The Grand Ballroom NYC"
              />
            </div>

            <button
              type="button"
              onClick={() => setAddManually(true)}
              style={{
                marginTop: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#8B774B',
                fontSize: '0.9rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              Or add venue manually
            </button>
          </div>
        )}

        {/* ── Manual empty form ─────────────────────────── */}
        {showManual && (
          <div style={{ marginBottom: '2rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.375rem',
                  color: '#2C2416',
                  margin: 0,
                }}
              >
                Add your venue
              </h2>
              <button
                type="button"
                onClick={() => setAddManually(false)}
                style={{
                  background: 'none',
                  border: '1px solid #D4C9B0',
                  borderRadius: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  color: '#8B774B',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                }}
              >
                ← Back to search
              </button>
            </div>
            <VenueProfile
              venue={{}}
              onChange={updated => setVenue(updated)}
              onSave={async () => {
                setVenue(v => v ?? {});
              }}
              isSaving={false}
            />
          </div>
        )}

        {/* ── Venue profile form (after selection/load) ── */}
        {venue && (
          <div>
            {/* "Change venue" link */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.375rem',
                  color: '#2C2416',
                  margin: 0,
                }}
              >
                Venue Details
              </h2>
              <button
                type="button"
                onClick={() => {
                  setVenue(null);
                  setSavedVenueId(null);
                  setAddManually(false);
                }}
                style={{
                  background: 'none',
                  border: '1px solid #D4C9B0',
                  borderRadius: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  color: '#8B774B',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                }}
              >
                Change venue
              </button>
            </div>

            <VenueProfile
              venue={venue}
              onChange={setVenue}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </div>
        )}

        {/* ── AI tip card ──────────────────────────────── */}
        <div
          style={{
            marginTop: '2.5rem',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #F5F1E8 0%, #EDE6D4 100%)',
            borderRadius: '1rem',
            border: '1px solid #D4C9B0',
            display: 'flex',
            gap: '0.875rem',
            alignItems: 'flex-start',
          }}
        >
          <Sparkles size={20} style={{ color: '#8B774B', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, color: '#6B5F4B', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <strong style={{ color: '#2C2416' }}>Pearloom tip:</strong> Once your venue is set,
            Pearloom can help you plan your seating chart and travel details for guests — from
            nearest airports to hotel block suggestions tailored to your location.
          </p>
        </div>
      </main>
    </div>
  );
}
