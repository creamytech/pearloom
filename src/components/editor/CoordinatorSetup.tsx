'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Target, MessageCircle, Shirt, Clock, Bus } from 'lucide-react';
import type { StoryManifest } from '@/types';

const QUESTION_ICONS: Record<string, React.ReactNode> = {
  parking: <span style={{ fontSize: '13px' }}>•</span>,
  shirt: <Shirt size={13} style={{ color: '#18181B' }} />,
  clock: <Clock size={13} style={{ color: '#18181B' }} />,
  bus: <Bus size={13} style={{ color: '#18181B' }} />,
};

const SUGGESTED_QUESTIONS = [
  { icon: 'parking', label: 'Where is parking?' },
  { icon: 'shirt', label: 'Dress code?' },
  { icon: 'clock', label: 'What time?' },
  { icon: 'bus', label: 'Shuttle info?' },
];

interface CoordinatorSetupProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

interface FaqEntry {
  q: string;
  a: string;
}

export default function CoordinatorSetup({ manifest, onChange }: CoordinatorSetupProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const faqs: FaqEntry[] = (manifest as { coordinatorFaqs?: FaqEntry[] }).coordinatorFaqs || [];
  const coordinatorEnabled: boolean =
    (manifest as { coordinatorEnabled?: boolean }).coordinatorEnabled ?? true;

  const logistics = manifest.logistics || {};
  const events = manifest.events || [];

  // Is the coordinator reasonably configured?
  const hasVenueInfo =
    !!(logistics.venue || logistics.date || logistics.time || events.length > 0);

  function update(patch: Partial<{ coordinatorFaqs: FaqEntry[]; coordinatorEnabled: boolean }>) {
    onChange({ ...manifest, ...patch } as StoryManifest);
  }

  function addFaq() {
    if (faqs.length >= 10) return;
    update({ coordinatorFaqs: [...faqs, { q: '', a: '' }] });
  }

  function removeFaq(index: number) {
    update({ coordinatorFaqs: faqs.filter((_, i) => i !== index) });
  }

  function updateFaq(index: number, field: 'q' | 'a', value: string) {
    const updated = faqs.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq));
    update({ coordinatorFaqs: updated });
  }

  // Derive couple names for the preview widget
  const coupleId = manifest.coupleId || '';
  // We use a placeholder VibeSkin for the preview
  const previewVibeSkin = manifest.vibeSkin || {
    palette: {
      background: '#fdf8f0',
      foreground: '#2d2826',
      accent: '#7c6e64',
      accent2: '#b5a99a',
      card: '#fff',
      muted: '#9a8e85',
      highlight: '#e8ddd4',
      subtle: '#f5f1e8',
      ink: '#1a1512',
    },
  } as StoryManifest['vibeSkin'];

  return (
    <div style={{ fontFamily: 'inherit', color: '#2d2826' }}>
      {/* Section header */}
      <div style={{ marginBottom: '6px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} style={{ color: '#18181B' }} /> Wedding Day Coordinator AI
        </h3>
        <p style={{ fontSize: '13px', color: '#6b6058', margin: '4px 0 0 0', lineHeight: 1.5 }}>
          Guests can ask your coordinator anything — powered by the details you provide.
        </p>
      </div>

      {/* Status indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '10px',
          backgroundColor: hasVenueInfo ? '#eef7ee' : '#fff8ed',
          border: `1px solid ${hasVenueInfo ? '#b8ddb8' : '#f0d9a0'}`,
          marginBottom: '20px',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        {hasVenueInfo ? (
          <>
            <span style={{ color: '#3d8b3d' }}>✓</span>
            <span style={{ color: '#3d6b3d' }}>Active — coordinator is ready to answer guest questions</span>
          </>
        ) : (
          <>
            <span style={{ color: '#b87800' }}>⚠</span>
            <span style={{ color: '#7a5500' }}>Add venue details to activate the coordinator</span>
          </>
        )}
      </div>

      {/* Enable toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '10px 12px',
          backgroundColor: '#fff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Show coordinator widget on site</div>
          <div style={{ fontSize: '12px', color: '#9a8e85', marginTop: '2px' }}>
            Displays the floating chat button for guests
          </div>
        </div>
        <button
          role="switch"
          aria-checked={coordinatorEnabled}
          onClick={() => update({ coordinatorEnabled: !coordinatorEnabled })}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: coordinatorEnabled ? '#6b7c5e' : '#d0cac4',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background-color 0.2s ease',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '3px',
              left: coordinatorEnabled ? '23px' : '3px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>

      {/* Custom Q&A section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Custom Questions &amp; Answers</div>
            <div style={{ fontSize: '12px', color: '#9a8e85', marginTop: '2px' }}>
              Help guests with specific info not in the standard details.
            </div>
          </div>
          {faqs.length < 10 && (
            <button
              onClick={addFaq}
              style={{
                backgroundColor: '#6b7c5e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 13px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                fontFamily: 'inherit',
              }}
            >
              + Add Question
            </button>
          )}
        </div>

        {faqs.length === 0 && (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#faf7f2',
              border: '1.5px dashed #d0c8be',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#9a8e85',
              fontSize: '13px',
            }}
          >
            No custom Q&amp;A yet. Add questions guests commonly ask!
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#fff',
                border: '1px solid rgba(0,0,0,0.09)',
                borderRadius: '12px',
                padding: '14px',
                position: 'relative',
              }}
            >
              <button
                onClick={() => removeFaq(i)}
                aria-label="Remove this Q&A"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9a8e85',
                  fontSize: '16px',
                  padding: '2px 4px',
                  lineHeight: 1,
                  fontFamily: 'inherit',
                }}
              >
                ✕
              </button>
              <div style={{ marginBottom: '8px' }}>
                <label
                  style={{ fontSize: '12px', fontWeight: 600, color: '#6b6058', display: 'block', marginBottom: '4px' }}
                >
                  Q:
                </label>
                <input
                  type="text"
                  value={faq.q}
                  onChange={e => updateFaq(i, 'q', e.target.value)}
                  placeholder="Where should guests with mobility needs park?"
                  style={{
                    width: '100%',
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    color: '#2d2826',
                    backgroundColor: '#faf7f2',
                    outline: 'none',
                    boxSizing: 'border-box',
                    paddingRight: '36px',
                  }}
                />
              </div>
              <div>
                <label
                  style={{ fontSize: '12px', fontWeight: 600, color: '#6b6058', display: 'block', marginBottom: '4px' }}
                >
                  A:
                </label>
                <textarea
                  value={faq.a}
                  onChange={e => updateFaq(i, 'a', e.target.value)}
                  placeholder="There are 5 accessible spots next to the main entrance"
                  rows={2}
                  style={{
                    width: '100%',
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    color: '#2d2826',
                    backgroundColor: '#faf7f2',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {faqs.length >= 10 && (
          <div style={{ fontSize: '12px', color: '#9a8e85', marginTop: '8px', textAlign: 'center' }}>
            Maximum of 10 custom Q&amp;As reached.
          </div>
        )}
      </div>

      {/* Preview button */}
      <button
        onClick={() => setPreviewOpen(true)}
        style={{
          backgroundColor: 'transparent',
          border: '1.5px solid #6b7c5e',
          color: '#6b7c5e',
          borderRadius: '10px',
          padding: '10px 18px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
          fontFamily: 'inherit',
          transition: 'background 0.12s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f0f5ee';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }}
      >
        Test the coordinator →
      </button>

      {/* Preview modal */}
      {previewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#faf7f2',
              borderRadius: '10px',
              padding: '24px',
              width: 'min(440px, 100%)',
              position: 'relative',
              boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Coordinator Preview</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#6b6058',
                  padding: '4px',
                  lineHeight: 1,
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#9a8e85', margin: '0 0 16px 0' }}>
              This is how the coordinator responds to your guests. The floating button appears on
              your live site.
            </p>
            {/* Inline preview — render the widget in a contained preview box */}
            <div style={{ position: 'relative', height: '460px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
              <PreviewCoordinator
                siteId={coupleId || 'preview'}
                coupleNames={
                  // Try to infer names from the manifest coupleId or fall back
                  ['Partner 1', 'Partner 2'] as [string, string]
                }
                vibeSkin={previewVibeSkin!}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inline preview variant — same widget but rendered inside the
// preview container rather than fixed to the viewport.
// ─────────────────────────────────────────────────────────────

interface PreviewCoordinatorProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin: NonNullable<StoryManifest['vibeSkin']>;
}

function PreviewCoordinator({ siteId, coupleNames, vibeSkin }: PreviewCoordinatorProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const accentColor = vibeSkin?.palette?.accent || '#7c6e64';
  const foreground = vibeSkin?.palette?.foreground || '#2d2826';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user' as const, content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, message: text.trim(), history: messages }),
      });
      const data = await res.json();
      setMessages([...updated, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...updated, { role: 'assistant', content: "I'm having a moment — please check with the couple!" }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const [name1, name2] = coupleNames;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(245,241,232,0.97)', fontFamily: 'inherit', color: foreground }}>
      <style>{`
        @keyframes previewDot {
          0%,80%,100%{transform:scale(0.6);opacity:0.4}
          40%{transform:scale(1);opacity:1}
        }
      `}</style>
      {/* Header */}
      <div style={{ backgroundColor: accentColor, color: '#fff', padding: '10px 12px', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MessageCircle size={16} style={{ color: '#fff' }} /> Wedding Coordinator
        </div>
        <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>Ask anything about the big day</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--pl-cream)', borderRadius: '14px 14px 14px 4px', padding: '8px 10px', fontSize: '14px', lineHeight: 1.5, maxWidth: '88%', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          Hi! I'm your celebration assistant for {name1} &amp; {name2}'s site. Ask me anything!
        </div>

        {messages.length === 0 && (
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--pl-muted, #9A9488)', marginBottom: '8px', fontWeight: 500 }}>Quick questions:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SUGGESTED_QUESTIONS.map(q => (
                <button key={q.label} onClick={() => sendMessage(q.label)}
                  style={{ backgroundColor: 'var(--pl-cream)', border: `1.5px solid ${accentColor}30`, borderRadius: '10px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', color: foreground, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}>
                  <span>{QUESTION_ICONS[q.icon] || q.icon}</span> {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? '#6b7c5e' : 'var(--pl-cream)', color: msg.role === 'user' ? '#fff' : foreground, borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 10px', fontSize: '14px', lineHeight: 1.5, maxWidth: '88%', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', whiteSpace: 'pre-wrap' }}>
            {msg.content}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--pl-cream)', borderRadius: '14px 14px 14px 4px', padding: '10px 12px', display: 'flex', gap: '5px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            {[0,1,2].map(i => <span key={i} style={{ width: '7px', height: '7px', backgroundColor: accentColor, borderRadius: '50%', display: 'inline-block', animation: `previewDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'flex-end', backgroundColor: '#18181B' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a question..." rows={1}
          style={{ flex: 1, border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '12px', padding: '9px 13px', fontSize: '14px', fontFamily: 'inherit', resize: 'none', outline: 'none', backgroundColor: 'var(--pl-cream)', color: foreground, lineHeight: 1.5, maxHeight: '80px', overflowY: 'auto' }} />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          style={{ backgroundColor: accentColor, color: '#fff', border: 'none', borderRadius: '12px', padding: '9px 16px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1, flexShrink: 0 }}>
          Send →
        </button>
      </div>
    </div>
  );
}
