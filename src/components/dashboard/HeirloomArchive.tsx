'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/HeirloomArchive.tsx
// Heirloom Archive system — archive management with bento cards,
// restoration progress bars, inventory sync status, Archive Live toggle.
// Matches Stitch "Heirloom Archive (Library)" screen.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive, RefreshCw, Globe, ExternalLink,
  BookOpen, Sparkles, Download, Trash2, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import type { StoryManifest } from '@/types';

// ── Types ────────────────────────────────────────────────────

interface ArchiveEntry {
  id: string;
  title: string;
  description: string;
  coverPhoto?: string;
  restorationProgress: number; // 0–100
  status: 'draft' | 'restored' | 'published' | 'archived';
  lastSynced?: string;
  version: string;
  createdAt: string;
}

// ── Restoration Progress Bar ─────────────────────────────────

function RestorationProgress({ progress }: { progress: number }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginBottom: '4px',
      }}>
        <span style={{
          fontSize: '0.58rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--pl-muted)',
        }}>
          Restoration Progress
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 600,
          color: progress === 100 ? 'var(--pl-olive-deep)' : 'var(--pl-ink-soft)',
        }}>
          {progress}%
        </span>
      </div>
      <div style={{
        height: '4px', borderRadius: '2px',
        background: 'var(--pl-cream-deep)',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '100%', borderRadius: '2px',
            background: progress === 100
              ? 'var(--pl-olive-deep)'
              : 'linear-gradient(90deg, var(--pl-olive), var(--pl-gold))',
          }}
        />
      </div>
    </div>
  );
}

// ── Inventory Sync Card ──────────────────────────────────────

function InventorySyncCard({ lastSynced }: { lastSynced?: string }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  return (
    <Card variant="elevated" padding="md">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '36px', height: '36px',
          borderRadius: '10px',
          background: 'var(--pl-cream-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Archive size={18} color="var(--pl-muted)" />
        </div>
        <div>
          <h4 style={{
            fontSize: '0.92rem',
            fontFamily: 'var(--pl-font-heading)',
            fontStyle: 'italic',
            fontWeight: 600,
            color: 'var(--pl-ink)',
            margin: 0,
          }}>
            Inventory Sync
          </h4>
        </div>
      </div>
      <p style={{
        fontSize: '0.75rem',
        color: 'var(--pl-muted)',
        margin: '0 0 12px',
      }}>
        {lastSynced
          ? `Last synced ${lastSynced} via Curator AI.`
          : 'Not yet synced.'}
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleSync}
        loading={syncing}
        icon={<RefreshCw size={12} />}
        className="w-full"
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </Button>
    </Card>
  );
}

// ── Archive Card ─────────────────────────────────────────────

function ArchiveCard({ entry }: { entry: ArchiveEntry }) {
  const statusBadge = {
    draft: { variant: 'muted' as const, label: 'Draft' },
    restored: { variant: 'success' as const, label: 'Restored' },
    published: { variant: 'default' as const, label: 'Published' },
    archived: { variant: 'curated' as const, label: 'Archived' },
  };
  const badge = statusBadge[entry.status];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      style={{
        borderRadius: 'var(--pl-radius-lg)',
        overflow: 'hidden',
        background: 'white',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 1px 4px rgba(43,30,20,0.04)',
      }}
    >
      {/* Cover image */}
      {entry.coverPhoto && (
        <div style={{
          width: '100%', height: '160px',
          background: `url(${entry.coverPhoto}) center/cover`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', bottom: '12px', left: '12px',
          }}>
            <Badge variant={badge.variant} size="sm">
              {badge.label}
            </Badge>
          </div>
        </div>
      )}

      <div style={{ padding: '16px' }}>
        <h3 style={{
          fontSize: '1rem',
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          fontWeight: 600,
          color: 'var(--pl-ink)',
          marginBottom: '4px',
        }}>
          {entry.title}
        </h3>
        <p style={{
          fontSize: '0.78rem',
          color: 'var(--pl-muted)',
          lineHeight: 1.5,
          marginBottom: '12px',
        }}>
          {entry.description}
        </p>

        <RestorationProgress progress={entry.restorationProgress} />

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
        }}>
          <span style={{
            fontSize: '0.62rem', fontWeight: 600,
            color: 'var(--pl-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            v{entry.version}
          </span>
          <span style={{
            fontSize: '0.62rem',
            color: 'var(--pl-muted)',
          }}>
            {entry.lastSynced ? `Synced ${entry.lastSynced}` : 'Not synced'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Export Entry Modal ────────────────────────────────────────

function ExportEntryModal({ open, onClose, entry }: {
  open: boolean;
  onClose: () => void;
  entry?: ArchiveEntry;
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    // In production, this would call /api/export-pdf
    setTimeout(() => {
      setExporting(false);
      onClose();
    }, 2000);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-[420px]">
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <h3 style={{
          fontSize: '1.5rem',
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          fontWeight: 600,
          color: 'var(--pl-ink)',
          marginBottom: '12px',
        }}>
          Export Entry?
        </h3>
        <p style={{
          fontSize: '0.88rem',
          color: 'var(--pl-muted)',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}>
          This will generate a high-resolution PDF with all associated metadata. Proceed with export?
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleExport}
            loading={exporting}
            icon={<Download size={14} />}
          >
            Export
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Archive View ────────────────────────────────────────

interface HeirloomArchiveProps {
  entries?: ArchiveEntry[];
  onStartCurator?: () => void;
}

export function HeirloomArchive({ entries = [], onStartCurator }: HeirloomArchiveProps) {
  const [archiveLive, setArchiveLive] = useState(true);
  const [exportEntry, setExportEntry] = useState<ArchiveEntry | undefined>();

  if (entries.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '4rem 2rem',
        maxWidth: '480px', margin: '0 auto',
      }}>
        <div style={{
          width: '64px', height: '64px',
          borderRadius: '16px',
          background: 'var(--pl-cream-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <BookOpen size={28} color="var(--pl-muted)" />
        </div>
        <h3 style={{
          fontSize: '1.3rem',
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          color: 'var(--pl-ink)',
          marginBottom: '8px',
        }}>
          No Archives Found
        </h3>
        <p style={{
          fontSize: '0.88rem',
          color: 'var(--pl-muted)',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}>
          Begin your legacy by curating your first digital artifact into the Pearloom collection.
        </p>
        <Button
          variant="secondary"
          size="md"
          onClick={onStartCurator}
          icon={<Sparkles size={14} />}
        >
          Start Curator
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Archive header + Archive Live toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <h2 style={{
            fontSize: '1.6rem',
            fontFamily: 'var(--pl-font-heading)',
            fontWeight: 500,
            color: 'var(--pl-ink-soft)',
            margin: 0,
          }}>
            Heirloom Archive
          </h2>
          <p style={{
            fontSize: '0.78rem', color: 'var(--pl-muted)',
            marginTop: '2px',
          }}>
            {entries.length} artifact{entries.length !== 1 ? 's' : ''} in collection
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Switch
            checked={archiveLive}
            onChange={setArchiveLive}
            label="Archive Live"
          />
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {entries.map((entry) => (
          <ArchiveCard key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Side panel: Inventory Sync + Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
        <InventorySyncCard lastSynced="4 minutes ago" />
        <Card variant="elevated" padding="md">
          <div style={{
            background: 'linear-gradient(135deg, var(--pl-gold), #b89a5a)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
          }}>
            <p style={{
              fontSize: '0.62rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: '6px', opacity: 0.8,
            }}>
              Active Subscription
            </p>
            <h4 style={{
              fontSize: '1.1rem',
              fontFamily: 'var(--pl-font-heading)',
              fontStyle: 'italic',
              fontWeight: 600,
              marginBottom: '12px',
            }}>
              Pearloom Premium
            </h4>
            <Button variant="secondary" size="sm" className="border-white/30 text-white hover:bg-white/10">
              Manage Plan
            </Button>
          </div>
        </Card>
      </div>

      {/* Export modal */}
      <ExportEntryModal
        open={!!exportEntry}
        onClose={() => setExportEntry(undefined)}
        entry={exportEntry}
      />
    </div>
  );
}

export type { ArchiveEntry };
