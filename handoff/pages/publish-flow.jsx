/* =========================================================================
   PEARLOOM — PUBLISH & SHARE
   A go-live flow: claim a pearloom.com address, set visibility, then a
   celebratory "you're live" with a themed share card + copy/social links.
   Export PublishFlow (renders when `open`).
   ========================================================================= */

const { useState: usePubState } = React;

function PubShareCard({ themeId }) {
  const theme = (typeof getTheme !== 'undefined') ? getTheme(themeId || 'santorini') : null;
  if (!theme) return null;
  return (
    <div style={{ ...themeRootStyle({ vars: theme.vars }, 'comfortable'), position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'var(--t-section)', aspectRatio: '1200/630', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', border: '1px solid var(--t-line)' }}>
      <TextureLayer texture={theme.texture} intensity={1}/>
      {theme.motif !== 'none' && <>
        <div style={{ position: 'absolute', top: 12, left: 14, opacity: 0.5, transform: 'scaleX(-1)' }}><Motif kind={theme.motif} size={42}/></div>
        <div style={{ position: 'absolute', top: 12, right: 14, opacity: 0.5 }}><Motif kind={theme.motif} size={42}/></div>
      </>}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 6 }}>You're invited</div>
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 30, lineHeight: 1, color: 'var(--t-ink)' }}>Scott<span style={{ fontStyle: 'italic', fontSize: '0.6em', color: 'var(--t-ink-soft)', margin: '0 0.14em', fontWeight: 400 }}>&amp;</span>Shauna</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}><TDivider look="sprig" width={100}/></div>
        <div style={{ fontSize: 10.5, color: 'var(--t-ink-soft)' }}>April 26, 2027 · Santorini</div>
      </div>
    </div>
  );
}

function PublishFlow({ open, onClose, themeId }) {
  const [step, setStep] = usePubState('review');
  const [slug, setSlug] = usePubState('scott-and-shauna');
  const [privacy, setPrivacy] = usePubState('public');
  const [copied, setCopied] = usePubState(false);
  if (!open) return null;
  const url = `pearloom.com/${slug}`;
  const go = () => { setStep('publishing'); setTimeout(() => setStep('live'), 1400); };
  const copy = () => { try { navigator.clipboard.writeText('https://' + url); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(40,40,30,0.5)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 22 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: 'var(--card)', borderRadius: 22, position: 'relative', boxShadow: 'var(--shadow-lg)', animation: 'us-in 240ms cubic-bezier(0.16,1,0.3,1)' }}>
        <style>{`@keyframes us-in{from{transform:scale(0.97);opacity:0}to{transform:none;opacity:1}}@keyframes pub-spin{to{transform:rotate(360deg)}}`}</style>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', zIndex: 3 }}><Icon name="close" size={15} color="var(--ink-soft)"/></button>

        {step === 'review' && (
          <div style={{ padding: '28px 28px 24px' }}>
            <div className="eyebrow" style={{ color: 'var(--lavender-ink)' }}>GO LIVE</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '4px 0 16px' }}>Publish your site</h2>
            <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-soft)' }}><PubShareCard themeId={themeId}/></div>

            <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Your address</label>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', overflow: 'hidden' }}>
              <span style={{ padding: '11px 4px 11px 13px', fontSize: 14, color: 'var(--ink-muted)' }}>pearloom.com/</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())} style={{ flex: 1, padding: '11px 13px 11px 0', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, outline: 'none' }}/>
              <span style={{ padding: '0 13px', fontSize: 12, color: 'var(--sage-deep)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12} color="var(--sage-deep)"/> Available</span>
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '16px 0 8px' }}>Who can see it</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['public', 'globe', 'Public', 'Anyone with the link'], ['password', 'lock', 'Password protected', 'Guests enter a shared password'], ['private', 'eye-off', 'Private', 'Only you & your partner']].map(([v, ic, t, s]) => (
                <button key={v} onClick={() => setPrivacy(v)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 11, textAlign: 'left', cursor: 'pointer', background: privacy === v ? 'var(--cream-2)' : 'var(--card)', border: privacy === v ? '2px solid var(--ink)' : '1px solid var(--line)' }}>
                  <Icon name={ic} size={16} color="var(--ink-soft)"/>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{s}</div></div>
                  {privacy === v && <Icon name="check" size={15} color="var(--ink)"/>}
                </button>
              ))}
            </div>
            <button onClick={go} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}>Publish to {url} <Icon name="arrow-up" size={13} color="var(--cream)"/></button>
          </div>
        )}

        {step === 'publishing' && (
          <div style={{ padding: '70px 28px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--cream-3)', borderTopColor: 'var(--sage-deep)', marginInline: 'auto', animation: 'pub-spin 0.8s linear infinite' }}/>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginTop: 18 }}>Going live…</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>Securing {url} and generating share cards.</div>
          </div>
        )}

        {step === 'live' && (
          <div style={{ padding: '30px 28px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--sage-tint)', display: 'grid', placeItems: 'center', marginInline: 'auto' }}><Pear size={32} tone="sage" sparkle shadow={false}/></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: '14px 0 4px' }}>You’re live! 🎉</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 16 }}>Your site is published. Share this link — it unfurls into the card below.</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--cream-2)', border: '1px solid var(--line)', marginBottom: 14 }}>
              <Icon name="globe" size={15} color="var(--ink-soft)"/>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: 'left' }}>{url}</span>
              <button onClick={copy} className="btn btn-primary btn-sm">{copied ? <><Icon name="check" size={12} color="var(--cream)"/> Copied</> : <><Icon name="copy" size={12} color="var(--cream)"/> Copy</>}</button>
            </div>

            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-soft)', marginBottom: 14 }}><PubShareCard themeId={themeId}/></div>

            <div style={{ display: 'flex', gap: 8 }}>
              {['Email', 'Messages', 'Instagram', 'Download card'].map((s, i) => (
                <button key={s} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11.5 }}>{s}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>Back to editing</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { PublishFlow });
