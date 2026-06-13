'use client';

/* =========================================================================
   PEARLOOM — PUBLISH & SHARE
   Literal port of ClaudeDesign/pages/publish-flow.jsx. A go-live flow:
   claim a pearloom.com address, set visibility, then a celebratory
   "you're live" with a themed share card + copy/social links.
   ========================================================================= */

import { useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { getPackById } from '@/lib/theme-store/packs';
import { Icon, Pear, Sprig } from '@/components/pearloom/motifs';
import { buildSiteUrl, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';

export interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  manifest: StoryManifest;
  onChange?: (m: StoryManifest) => void;
  siteSlug?: string;
}

function PubShareCard({ manifest }: { manifest: StoryManifest }) {
  const theme = manifest.theme;
  const accent = theme?.colors?.accent || '#5C6B3F';
  const ink = theme?.colors?.foreground || '#0E0D0B';
  const paper = theme?.colors?.background || '#F5EFE2';
  const inkSoft = 'rgba(14,13,11,0.65)';
  const line = 'rgba(14,13,11,0.18)';
  const display = theme?.fonts?.heading || 'var(--t-display, var(--pl-font-display))';
  /* Real names only — the prototype's hardcoded fallbacks
     ('Scott' / 'Shauna' / Santorini) leaked onto real hosts'
     publish cards: a solo site with an empty second name showed a
     fabricated partner. Solo honorees render one name, no '&'. */
  const n1 = (manifest.names?.[0] ?? '').trim() || 'Your name';
  const n2 = (manifest.names?.[1] ?? '').trim();
  const dateLine = manifest.logistics?.date && manifest.logistics?.venue
    ? `${manifest.logistics.date} · ${manifest.logistics.venue}`
    : (manifest.logistics?.date || manifest.logistics?.venue || '');
  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: paper, aspectRatio: '1200/630', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', border: '1px solid ' + line } as CSSProperties}>
      <div style={{ position: 'absolute', top: 12, left: 14, opacity: 0.5, transform: 'scaleX(-1)' }}><Sprig size={42} color={accent}/></div>
      <div style={{ position: 'absolute', top: 12, right: 14, opacity: 0.5 }}><Sprig size={42} color={accent}/></div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls, 0.22em)', textTransform: 'uppercase', color: accent, marginBottom: 6 } as CSSProperties}>You're invited</div>
        <div style={{ fontFamily: display, fontWeight: 600, fontSize: 30, lineHeight: 1, color: ink } as CSSProperties}>
          {n1}
          {n2 && <><span style={{ fontStyle: 'italic', fontSize: '0.6em', color: inkSoft, margin: '0 0.14em', fontWeight: 400 }}>&amp;</span>{n2}</>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 38, height: 1, background: line }} />
            <Sprig size={20} color={accent} />
            <span style={{ width: 38, height: 1, background: line }} />
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: inkSoft }}>{dateLine}</div>
      </div>
    </div>
  );
}

export function PublishModal({ open, onClose, manifest, onChange, siteSlug }: PublishModalProps) {
  const [step, setStep] = useState<'review' | 'publishing' | 'live'>('review');
  const [privacy, setPrivacy] = useState<'public' | 'password'>(() =>
    ((manifest as unknown as { privacyGate?: { password?: string } }).privacyGate?.password ?? '').trim()
      ? 'password' : 'public');
  const [gatePw, setGatePw] = useState(
    ((manifest as unknown as { privacyGate?: { password?: string } }).privacyGate?.password ?? ''),
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockBusy, setUnlockBusy] = useState(false);
  if (!open) return null;
  /* ── Pack paywall (client half) — the site is wearing a paid
     pack the host hasn't unlocked. Try-before-you-buy: they could
     APPLY it freely; publishing is the moment it's bought. The
     server gates too (/api/sites/publish 402) — this is the warm
     version. Ownership reads the shared 'pl-store-owned' key the
     store + webhook success page maintain. */
  const wornPack = (() => {
    const id = (manifest as unknown as { appliedPackId?: string }).appliedPackId;
    if (!id) return null;
    const pack = getPackById(id);
    if (!pack || pack.priceCents === 0) return null;
    try {
      const owned = new Set(JSON.parse(localStorage.getItem('pl-store-owned') || '[]'));
      if (owned.has(pack.id)) return null;
    } catch { /* private mode → trust the server gate */ }
    return pack;
  })();
  const unlockWornPack = async () => {
    if (!wornPack || unlockBusy) return;
    setUnlockBusy(true);
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packIds: [wornPack.id] }),
      });
      const { url: checkoutUrl } = (await res.json()) as { url?: string };
      if (res.ok && checkoutUrl) {
        try { sessionStorage.setItem('pl-shop-resume', wornPack.id); } catch { /* nicety */ }
        window.location.assign(checkoutUrl);
        return;
      }
      setError('Couldn’t start checkout — try again?');
    } catch {
      setError('Couldn’t start checkout — try again?');
    } finally {
      setUnlockBusy(false);
    }
  };
  /* The slug is the site's identity — it isn't editable here.
     (The prototype let you retype it past a fake "Available"
     badge, which forked the site to a second subdomain and
     showed a URL with no occasion prefix.) */
  const slug = siteSlug || 'your-site';
  const occasion = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion);
  const url = formatSiteDisplayUrl(slug, '', occasion);
  const fullUrl = buildSiteUrl(slug, '', undefined, occasion);
  const go = async () => {
    if (step === 'publishing' || wornPack) return;
    if (privacy === 'password' && !gatePw.trim()) {
      setError('Set the password guests will use — or switch back to public.');
      return;
    }
    setStep('publishing');
    setError(null);
    /* Privacy ships INSIDE the published manifest so the gate is
       live from the first request — and the same change lands in
       the editor's manifest via onChange below. */
    const next = {
      ...manifest,
      published: true,
      publishedAt: new Date().toISOString(),
      privacyGate: privacy === 'password' ? { password: gatePw.trim() } : undefined,
    } as StoryManifest;
    try {
      const res = await fetch('/api/sites/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: slug, manifest: next, names: manifest.names ?? [] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Publish failed (${res.status})`);
      }
      onChange?.(next);
      setStep('live');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
      setStep('review');
    }
  };
  const copy = () => {
    try { navigator.clipboard.writeText(fullUrl); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const ogSrc = `/api/og?slug=${encodeURIComponent(slug)}`;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(40,40,30,0.5)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 22 } as CSSProperties}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: 'var(--card)', borderRadius: 22, position: 'relative', boxShadow: 'var(--shadow-lg)', animation: 'us-in 240ms cubic-bezier(0.16,1,0.3,1)' } as CSSProperties}>
        <style>{`@keyframes us-in{from{transform:scale(0.97);opacity:0}to{transform:none;opacity:1}}@keyframes pub-spin{to{transform:rotate(360deg)}}`}</style>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', zIndex: 3 } as CSSProperties}><Icon name="close" size={15} color="var(--ink-soft)"/></button>

        {step === 'review' && (
          <div style={{ padding: '28px 28px 24px' }}>
            <div className="eyebrow" style={{ color: 'var(--lavender-ink)' }}>GO LIVE</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '4px 0 16px' }}>Publish your site</h2>
            <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-soft)' }}><PubShareCard manifest={manifest}/></div>
            {wornPack && (
              <div
                style={{
                  marginBottom: 16, padding: '14px 16px', borderRadius: 14,
                  background: 'var(--pl-glass)',
                  backgroundImage: 'var(--pl-glass-sheen)',
                  backdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
                  WebkitBackdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
                  border: '1px solid var(--pl-glass-border)',
                } as CSSProperties}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lavender-ink)' }}>
                  Wearing {wornPack.name}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink)', margin: '4px 0 6px' }}>
                  Make it yours to go live.
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 12 }}>
                  You&rsquo;ve been trying this pack on — it looks like it fits. Unlock it once and publish,
                  or switch back to a free look in the Theme panel.
                </div>
                <button
                  type="button"
                  onClick={unlockWornPack}
                  disabled={unlockBusy}
                  style={{
                    padding: '10px 22px', borderRadius: 999, border: 'none',
                    background: 'var(--ink)', color: 'var(--cream)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  } as CSSProperties}
                >
                  {unlockBusy ? 'Threading…' : `Unlock ${wornPack.name} · $${wornPack.priceCents / 100}`}
                </button>
              </div>
            )}

            <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Your address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)' }}>
              <Icon name="globe" size={14} color="var(--ink-muted)"/>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{url}</span>
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '16px 0 8px' }}>Who can see it</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([['public', 'globe', 'Public', 'Anyone with the link'], ['password', 'lock', 'Password protected', 'Guests enter a shared password']] as const).map(([v, ic, t, s]) => (
                <button key={v} onClick={() => setPrivacy(v)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 11, textAlign: 'left', cursor: 'pointer', background: privacy === v ? 'var(--cream-2)' : 'var(--card)', border: privacy === v ? '2px solid var(--ink)' : '1px solid var(--line)' } as CSSProperties}>
                  <Icon name={ic} size={16} color="var(--ink-soft)"/>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{s}</div></div>
                  {privacy === v && <Icon name="check" size={15} color="var(--ink)"/>}
                </button>
              ))}
              {privacy === 'password' && (
                <input
                  type="text"
                  value={gatePw}
                  onChange={(e) => setGatePw(e.target.value)}
                  placeholder="The password guests will enter"
                  autoComplete="off"
                  style={{ padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none' } as CSSProperties}
                />
              )}
            </div>
            {error && <div role="alert" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--pl-plum-mist)', border: '1px solid var(--pl-plum)', color: 'var(--pl-plum)', fontSize: 12.5, fontWeight: 600 } as CSSProperties}>{error}</div>}
            <button onClick={go} disabled={!!wornPack} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 18, opacity: wornPack ? 0.5 : 1, cursor: wornPack ? 'not-allowed' : 'pointer' } as CSSProperties}>{wornPack ? <>Unlock {wornPack.name} to publish</> : <>Publish to {url} <Icon name="arrow-up" size={13} color="var(--cream)"/></>}</button>
          </div>
        )}

        {step === 'publishing' && (
          <div style={{ padding: '70px 28px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--cream-3)', borderTopColor: 'var(--sage-deep)', marginInline: 'auto', animation: 'pub-spin 0.8s linear infinite' } as CSSProperties}/>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginTop: 18 }}>Going live…</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>Securing {url} and generating share cards.</div>
          </div>
        )}

        {step === 'live' && (
          <div style={{ padding: '30px 28px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--sage-tint)', display: 'grid', placeItems: 'center', marginInline: 'auto' } as CSSProperties}><Pear size={32} tone="sage" sparkle shadow={false}/></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: '14px 0 4px' }}>You{'’'}re live.</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 16 }}>Your site is published. Share this link — it unfurls into the card below.</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--cream-2)', border: '1px solid var(--line)', marginBottom: 14 }}>
              <Icon name="globe" size={15} color="var(--ink-soft)"/>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: 'left' }}>{url}</span>
              <button onClick={copy} className="btn btn-primary btn-sm">{copied ? <><Icon name="check" size={12} color="var(--cream)"/> Copied</> : <><Icon name="copy" size={12} color="var(--cream)"/> Copy</>}</button>
            </div>

            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-soft)', marginBottom: 14, background: 'var(--cream-2)' }}>
              {/* Real /api/og unfurl preview — falls back to the inline PubShareCard if the image fails. */}
              <img src={ogSrc} alt="Share card preview" style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '1200/630', objectFit: 'cover' } as CSSProperties} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}/>
              <PubShareCard manifest={manifest}/>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {/* Real share intents — the prototype's four dead buttons
                  (Instagram / Download had no implementation) are gone. */}
              <a href={`mailto:?subject=${encodeURIComponent("You're invited")}&body=${encodeURIComponent(fullUrl)}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11.5, textDecoration: 'none' }}>Email</a>
              <a href={`sms:?&body=${encodeURIComponent(fullUrl)}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11.5, textDecoration: 'none' }}>Messages</a>
              <a href={fullUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11.5, textDecoration: 'none' }}>Open site</a>
            </div>
            <button onClick={onClose} style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>Back to editing</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublishModal;
