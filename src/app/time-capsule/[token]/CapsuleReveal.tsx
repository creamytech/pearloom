'use client';

import { useState } from 'react';
import { parseLocalDate } from '@/lib/date';

interface CapsuleRevealProps {
  letter: string;
  fromName: string;
  toName: string;
  unlockDate: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return parseLocalDate(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function CapsuleReveal({
  letter,
  fromName,
  toName,
  unlockDate,
  createdAt,
}: CapsuleRevealProps) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <div style={envelopeStyles.page}>
        {/* CSS for the envelope animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes flapOpen {
            0%   { transform: rotateX(0deg); }
            100% { transform: rotateX(-180deg); }
          }
          .envelope-wrapper {
            animation: float 3s ease-in-out infinite;
          }
          .envelope-wrapper.opening .flap {
            animation: flapOpen 0.6s ease-in-out forwards;
            transform-origin: top center;
          }
          .open-btn:hover {
            background: rgba(214,198,168,0.18) !important;
            border-color: rgba(214,198,168,0.5) !important;
          }
        `}</style>

        <div style={envelopeStyles.card}>
          <div className="envelope-wrapper" style={envelopeStyles.envelopeWrap}>
            {/* Envelope body */}
            <div style={envelopeStyles.envelope}>
              {/* Flap */}
              <div className="flap" style={envelopeStyles.flap} />
              {/* Seal dot */}
              <div style={envelopeStyles.sealDot}>💌</div>
              {/* Bottom triangle */}
              <div style={envelopeStyles.bottomTriangle} />
            </div>
          </div>

          <h1 style={envelopeStyles.heading}>
            A letter is waiting for you
          </h1>
          <p style={envelopeStyles.sub}>
            From <strong style={envelopeStyles.name}>{fromName}</strong> to{' '}
            <strong style={envelopeStyles.name}>{toName}</strong>
          </p>
          <p style={envelopeStyles.dateLine}>
            Sealed on {formatDate(createdAt)}, opened today
          </p>

          <button
            className="open-btn"
            onClick={() => setOpened(true)}
            style={envelopeStyles.openBtn}
          >
            Open this letter
          </button>
        </div>
      </div>
    );
  }

  // ── Letter revealed ─────────────────────────────────────────────────────────
  return (
    <div style={letterStyles.page}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .letter-card {
          animation: fadeInUp 0.7s ease-out both;
        }
      `}</style>

      <div className="letter-card" style={letterStyles.card}>
        {/* Paper texture overlay */}
        <div style={letterStyles.texture} aria-hidden="true" />

        {/* Decorative top */}
        <div style={letterStyles.topDecor}>💌</div>

        {/* Greeting */}
        <p style={letterStyles.greeting}>Dear {toName},</p>

        {/* Letter body */}
        <div style={letterStyles.body}>
          {letter.split('\n').map((line, i) =>
            line.trim() === '' ? (
              <br key={i} />
            ) : (
              <p key={i} style={letterStyles.paragraph}>
                {line}
              </p>
            )
          )}
        </div>

        {/* Sign-off */}
        <div style={letterStyles.signOff}>
          <p style={letterStyles.signOffLine}>With all my love,</p>
          <p style={letterStyles.signOffName}>{fromName}</p>
        </div>

        {/* Footer dates */}
        <div style={letterStyles.dates}>
          <span style={letterStyles.dateItem}>
            Written:{' '}
            <span style={letterStyles.dateValue}>{formatDate(createdAt)}</span>
          </span>
          <span style={letterStyles.dateSep}>·</span>
          <span style={letterStyles.dateItem}>
            Opened:{' '}
            <span style={letterStyles.dateValue}>
              {formatDate(new Date().toISOString())}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Envelope styles ───────────────────────────────────────────────────────────

const envelopeStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1C1916',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  },
  envelopeWrap: {
    marginBottom: '8px',
  },
  envelope: {
    position: 'relative',
    width: '140px',
    height: '100px',
    background: '#2E2720',
    border: '2px solid rgba(214,198,168,0.3)',
    borderRadius: '4px',
    overflow: 'visible',
  },
  flap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeft: '70px solid transparent',
    borderRight: '70px solid transparent',
    borderTop: '52px solid rgba(214,198,168,0.18)',
    transformOrigin: 'top center',
    zIndex: 2,
  },
  sealDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '28px',
    zIndex: 3,
  },
  bottomTriangle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeft: '70px solid transparent',
    borderRight: '70px solid transparent',
    borderBottom: '52px solid rgba(214,198,168,0.1)',
  },
  heading: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--pl-muted)',
    lineHeight: 1.3,
  },
  sub: {
    margin: 0,
    fontSize: '15px',
    color: 'rgba(214,198,168,0.65)',
  },
  name: {
    color: 'var(--pl-muted)',
  },
  dateLine: {
    margin: 0,
    fontSize: '12px',
    color: 'rgba(214,198,168,0.38)',
    fontStyle: 'italic',
  },
  openBtn: {
    background: 'rgba(214,198,168,0.08)',
    border: '1px solid rgba(214,198,168,0.3)',
    borderRadius: '8px',
    color: 'var(--pl-muted)',
    fontSize: '15px',
    fontWeight: 500,
    padding: '12px 32px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
};

// ── Letter styles ─────────────────────────────────────────────────────────────

const letterStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#F5F1E8',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '48px 24px',
    fontFamily: 'Georgia, serif',
  },
  card: {
    position: 'relative',
    background: '#FAF7F0',
    borderRadius: '4px',
    boxShadow: '0 4px 32px rgba(60,45,30,0.18), 0 1px 4px rgba(60,45,30,0.1)',
    padding: '56px 52px 48px',
    maxWidth: '600px',
    width: '100%',
    border: '1px solid rgba(180,160,120,0.25)',
    overflow: 'hidden',
  },
  // Subtle paper texture
  texture: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 28px,
        rgba(160,140,100,0.06) 28px,
        rgba(160,140,100,0.06) 29px
      )
    `,
    pointerEvents: 'none',
    zIndex: 0,
  },
  topDecor: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    fontSize: '28px',
    marginBottom: '32px',
  },
  greeting: {
    position: 'relative',
    zIndex: 1,
    fontSize: '18px',
    color: '#3C2D1E',
    margin: '0 0 24px 0',
    fontStyle: 'italic',
    fontWeight: 400,
  },
  body: {
    position: 'relative',
    zIndex: 1,
  },
  paragraph: {
    fontSize: '16px',
    color: '#3C2D1E',
    lineHeight: 1.8,
    margin: '0 0 8px 0',
    fontWeight: 400,
  },
  signOff: {
    position: 'relative',
    zIndex: 1,
    marginTop: '32px',
  },
  signOffLine: {
    fontSize: '15px',
    color: '#3C2D1E',
    margin: '0 0 4px 0',
    fontStyle: 'italic',
  },
  signOffName: {
    fontSize: '17px',
    color: '#3C2D1E',
    margin: '0',
    fontWeight: 600,
  },
  dates: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(160,140,100,0.2)',
    flexWrap: 'wrap',
  },
  dateItem: {
    fontSize: '12px',
    color: 'rgba(60,45,30,0.5)',
    fontFamily: 'system-ui, sans-serif',
  },
  dateValue: {
    color: 'rgba(60,45,30,0.7)',
    fontWeight: 500,
  },
  dateSep: {
    color: 'rgba(60,45,30,0.3)',
    fontSize: '12px',
  },
};
