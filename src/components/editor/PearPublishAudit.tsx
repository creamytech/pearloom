'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / PearPublishAudit.tsx — Pre-publish site audit
// Checks for common issues before publishing and offers
// AI-powered fixes via "Fix with Pear" buttons.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Check, Loader2, X } from 'lucide-react';
import { PearIcon } from '@/components/icons/PearloomIcons';
import type { StoryManifest } from '@/types';

const OLIVE = '#18181B';

type IssueSeverity = 'warning' | 'info';

interface AuditIssue {
  id: string;
  message: string;
  severity: IssueSeverity;
  fixPrompt: string;
}

interface PearPublishAuditProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  onProceed: () => void;
  onClose: () => void;
}

function auditManifest(manifest: StoryManifest): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // No event date set
  if (!manifest.logistics?.date) {
    issues.push({
      id: 'no-date',
      message: 'No event date set',
      severity: 'warning',
      fixPrompt: 'Set an event date for my site. Ask me what date to use.',
    });
  }

  // No events added
  if (!manifest.events || manifest.events.length === 0) {
    issues.push({
      id: 'no-events',
      message: 'No events added to the schedule',
      severity: 'warning',
      fixPrompt: 'Add events to my schedule — ceremony, reception, and any other events. Ask me for the details.',
    });
  }

  // No photos in any chapter
  const hasPhotos = manifest.chapters?.some(c => c.images && c.images.length > 0);
  if (!hasPhotos) {
    issues.push({
      id: 'no-photos',
      message: 'No photos in any chapter',
      severity: 'info',
      fixPrompt: 'Help me add photos to my story chapters. Walk me through how to upload and organize them.',
    });
  }

  // Hero tagline is default/empty
  const tagline = manifest.poetry?.heroTagline;
  if (!tagline || tagline === 'A love story' || tagline === 'Our Story' || tagline.length < 5) {
    issues.push({
      id: 'default-tagline',
      message: 'Hero tagline is default or empty',
      severity: 'warning',
      fixPrompt: 'Write a beautiful, personal hero tagline for my site using the couple names and any details you know.',
    });
  }

  // No FAQ section
  if (!manifest.faqs || manifest.faqs.length === 0) {
    issues.push({
      id: 'no-faqs',
      message: 'No FAQ section for guests',
      severity: 'info',
      fixPrompt: 'Write 5-7 FAQs that guests would actually ask about our event. Use real details from the site. If info is missing, ask me.',
    });
  }

  // No registry links
  const hasRegistry = manifest.registry?.enabled &&
    ((manifest.registry.entries && manifest.registry.entries.length > 0) || manifest.registry.cashFundUrl);
  if (!hasRegistry) {
    issues.push({
      id: 'no-registry',
      message: 'No registry or gift links',
      severity: 'info',
      fixPrompt: 'Help me set up a gift registry section. Ask me for registry URLs or if I want a cash fund.',
    });
  }

  // No dress code on events
  if (manifest.events && manifest.events.length > 0) {
    const hasDressCode = manifest.events.some(e => e.dressCode && e.dressCode.trim().length > 0);
    if (!hasDressCode && !manifest.logistics?.dresscode) {
      issues.push({
        id: 'no-dresscode',
        message: 'No dress code specified for events',
        severity: 'info',
        fixPrompt: 'Add a dress code to my events. Suggest an appropriate dress code based on the venue and vibe.',
      });
    }
  }

  // No venue address
  if (!manifest.logistics?.venueAddress && !manifest.logistics?.venue) {
    issues.push({
      id: 'no-venue',
      message: 'No venue address set',
      severity: 'warning',
      fixPrompt: 'Help me add venue details. Ask me for the venue name and address.',
    });
  }

  // Welcome message is default or empty
  const welcome = manifest.poetry?.welcomeStatement;
  if (!welcome || welcome.length < 20) {
    issues.push({
      id: 'default-welcome',
      message: 'Welcome message is default or empty',
      severity: 'info',
      fixPrompt: 'Write a warm, personal welcome message for our site that reflects our personality and sets the tone for guests.',
    });
  }

  // No RSVP block
  const hasRsvpBlock = manifest.blocks?.some(b => b.type === 'rsvp' && b.visible !== false);
  if (!hasRsvpBlock) {
    issues.push({
      id: 'no-rsvp',
      message: 'No RSVP section on the site',
      severity: 'warning',
      fixPrompt: 'Add an RSVP section to my site so guests can respond.',
    });
  }

  return issues;
}

export function PearPublishAudit({ manifest, coupleNames, onProceed, onClose }: PearPublishAuditProps) {
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [fixingAll, setFixingAll] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [autoProceed, setAutoProceed] = useState(false);

  // Run audit on mount
  useEffect(() => {
    const found = auditManifest(manifest);
    setIssues(found);

    // If no issues, auto-proceed after a brief display
    if (found.length === 0) {
      setAutoProceed(true);
      const t = setTimeout(() => onProceed(), 1500);
      return () => clearTimeout(t);
    }
  }, [manifest, onProceed]);

  const handleFixOne = useCallback((issue: AuditIssue) => {
    setFixingId(issue.id);
    window.dispatchEvent(new CustomEvent('pear-command', { detail: { prompt: issue.fixPrompt } }));
    // Close the audit after dispatching so user can interact with Pear
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  const handleFixAll = useCallback(() => {
    setFixingAll(true);
    // Compose a comprehensive prompt from all issues
    const issueList = issues.map((i) => `- ${i.message}`).join('\n');
    const prompt = `My site has the following issues before publishing:\n${issueList}\n\nPlease fix ALL of these issues at once. For missing content, write something personal and appropriate. For missing settings, use sensible defaults and ask me only for info you absolutely need. Use the couple names: ${coupleNames[0]} & ${coupleNames[1]}.`;
    window.dispatchEvent(new CustomEvent('pear-command', { detail: { prompt } }));
    setTimeout(() => onClose(), 300);
  }, [issues, coupleNames, onClose]);

  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        } as React.CSSProperties}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(250, 247, 242, 0.95)',
            borderRadius: '20px',
            border: '1px solid #E4E4E7',
            boxShadow: '0 24px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '28px',
          } as React.CSSProperties}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#F4F4F5',
                border: '1px solid rgba(24,24,27,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <PearIcon size={18} color={OLIVE} />
              </div>
              <div>
                <h2 style={{
                  fontFamily: 'var(--pl-font-heading, Playfair Display, serif)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--pl-ink, #2B1E14)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}>
                  {autoProceed ? 'Your site looks great!' : "Pear's Pre-Publish Check"}
                </h2>
                {!autoProceed && (
                  <p style={{ fontSize: '0.72rem', color: '#71717A', margin: '2px 0 0' }}>
                    {issues.length} {issues.length === 1 ? 'item' : 'items'} found before publishing
                  </p>
                )}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.04)',
              }}
            >
              <X size={14} color="#71717A" />
            </motion.button>
          </div>

          {/* All clear state */}
          {autoProceed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(24,24,27,0.06)',
                border: '1px solid rgba(24,24,27,0.1)',
              }}
            >
              <Check size={18} color={OLIVE} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#18181B' }}>
                Ready to publish! Proceeding...
              </span>
            </motion.div>
          )}

          {/* Issue list */}
          {!autoProceed && (
            <>
              {/* Warnings */}
              {warnings.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#c48a3f',
                    marginBottom: '8px',
                  }}>
                    Needs Attention
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {warnings.map((issue) => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        fixing={fixingId === issue.id}
                        onFix={() => handleFixOne(issue)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              {infos.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#71717A',
                    marginBottom: '8px',
                  }}>
                    Suggestions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {infos.map((issue) => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        fixing={fixingId === issue.id}
                        onFix={() => handleFixOne(issue)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleFixAll}
                  disabled={fixingAll}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: OLIVE,
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: fixingAll ? 'wait' : 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  {fixingAll ? (
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <PearIcon size={13} color="#fff" />
                  )}
                  Let Pear Fix Everything
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(0,0,0,0.06)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onProceed}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'rgba(0,0,0,0.03)',
                    color: 'var(--pl-ink-soft, #3D3530)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                  }}
                >
                  Publish Anyway
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Individual issue row ─────────────────────────────────────

function IssueRow({ issue, fixing, onFix }: { issue: AuditIssue; fixing: boolean; onFix: () => void }) {
  const isWarning = issue.severity === 'warning';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      borderRadius: '12px',
      background: isWarning ? 'rgba(196,138,63,0.06)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${isWarning ? 'rgba(196,138,63,0.15)' : 'rgba(0,0,0,0.04)'}`,
    }}>
      {isWarning ? (
        <AlertTriangle size={14} color="#c48a3f" style={{ flexShrink: 0 }} />
      ) : (
        <Info size={14} color="#71717A" style={{ flexShrink: 0 }} />
      )}
      <span style={{
        flex: 1,
        fontSize: '0.78rem',
        fontWeight: 500,
        color: 'var(--pl-ink-soft, #3D3530)',
        lineHeight: 1.4,
      }}>
        {issue.message}
      </span>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onFix}
        disabled={fixing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '8px',
          border: `1px solid #E4E4E7`,
          background: 'transparent',
          color: OLIVE,
          fontSize: '0.62rem',
          fontWeight: 700,
          cursor: fixing ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {fixing ? (
          <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <PearIcon size={10} color={OLIVE} />
        )}
        Fix with Pear
      </motion.button>
    </div>
  );
}
