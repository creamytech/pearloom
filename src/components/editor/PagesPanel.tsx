'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Eye, EyeOff, GripVertical, ChevronDown, ExternalLink } from 'lucide-react';
import { inp } from './editor-utils';
import type { StoryManifest } from '@/types';

export type OccasionType = 'wedding' | 'anniversary' | 'engagement' | 'birthday' | 'story';

interface PresetPage {
  id: string; slug: string; label: string;
  alwaysOn: boolean;
  occasions: OccasionType[];
}

export const ALL_SITE_PAGES: PresetPage[] = [
  { id: 'home',     slug: '',         label: 'Home',          alwaysOn: true,  occasions: ['wedding', 'anniversary', 'engagement', 'birthday', 'story'] },
  { id: 'schedule', slug: 'schedule', label: 'Schedule',      alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'rsvp',     slug: 'rsvp',     label: 'RSVP',          alwaysOn: false, occasions: ['wedding', 'engagement', 'birthday'] },
  { id: 'travel',   slug: 'travel',   label: 'Travel',        alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'registry', slug: 'registry', label: 'Registry',      alwaysOn: false, occasions: ['wedding', 'engagement', 'birthday'] },
  { id: 'faq',      slug: 'faq',      label: 'FAQ',           alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'guestbook',slug: 'guestbook',label: 'Guest Wishes',  alwaysOn: false, occasions: ['wedding', 'anniversary', 'birthday'] },
];

export function PagesPanel({ manifest, subdomain, onChange, onPreviewPage, previewPage }: {
  manifest: StoryManifest;
  subdomain: string;
  onChange: (m: StoryManifest) => void;
  onPreviewPage?: (slug: string | null) => void;
  previewPage?: string | null;
}) {
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');

  const occasion = (manifest.occasion || 'wedding') as OccasionType;
  const filteredPresets = ALL_SITE_PAGES.filter(p => p.occasions.includes(occasion));
  const hidden = new Set(manifest.hiddenPages || []);
  const customPages = manifest.customPages || [];

  const togglePageVisibility = (pageId: string) => {
    const hiddenList = manifest.hiddenPages || [];
    const isHidden = hiddenList.includes(pageId);
    onChange({ ...manifest, hiddenPages: isHidden ? hiddenList.filter(id => id !== pageId) : [...hiddenList, pageId] });
  };

  const addCustomPage = () => {
    if (!newPageTitle.trim()) return;
    const slug = newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newPage = {
      id: `page-${Date.now()}`, slug,
      title: newPageTitle.trim(), icon: '',
      blocks: [{ id: `b-text-${Date.now()}`, type: 'text' as const, order: 0, visible: true }],
      visible: true, order: customPages.length,
    };
    onChange({ ...manifest, customPages: [...customPages, newPage] });
    setNewPageTitle('');
    setShowAddPage(false);
  };

  const deleteCustomPage = (id: string) => {
    onChange({ ...manifest, customPages: customPages.filter(p => p.id !== id) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>

      {/* ── Active Pages ── */}
      <div style={{
        fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--pl-muted)', padding: '4px 4px 6px',
      }}>
        Site Pages · {filteredPresets.filter(p => !hidden.has(p.id)).length + customPages.length}
      </div>

      {/* Preset pages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 2px' }}>
        {filteredPresets.map(page => {
          const isHidden = hidden.has(page.id);
          return (
            <div
              key={page.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 10px 10px 12px',
                borderRadius: '14px',
                background: isHidden ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'all 0.15s',
                opacity: isHidden ? 0.5 : 1,
              }}
            >
              {/* Page name */}
              <span style={{
                flex: 1, fontSize: '0.82rem', fontWeight: 600,
                color: isHidden ? 'var(--pl-muted)' : 'var(--pl-ink)',
                textDecoration: isHidden ? 'line-through' : 'none',
              }}>
                {page.label}
              </span>

              {/* Preview button */}
              {onPreviewPage && !isHidden && (
                <button
                  onClick={() => onPreviewPage(page.slug || null)}
                  title="Preview this page"
                  style={{
                    width: '24px', height: '24px', borderRadius: '6px', border: 'none',
                    background: previewPage === page.slug ? 'rgba(163,177,138,0.2)' : 'transparent',
                    color: 'var(--pl-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ExternalLink size={12} />
                </button>
              )}

              {/* Toggle visibility */}
              {!page.alwaysOn && (
                <button
                  onClick={() => togglePageVisibility(page.id)}
                  title={isHidden ? 'Show page' : 'Hide page'}
                  style={{
                    width: '24px', height: '24px', borderRadius: '6px', border: 'none',
                    background: 'transparent',
                    color: isHidden ? '#e87070' : 'var(--pl-muted)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Custom Pages ── */}
      {customPages.length > 0 && (
        <>
          <div style={{
            fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--pl-muted)', padding: '12px 4px 6px',
            borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '4px',
          }}>
            Custom Pages · {customPages.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 2px' }}>
            {customPages.map(page => (
              <div
                key={page.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 10px 10px 12px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-ink)' }}>
                  {page.title}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--pl-muted)' }}>
                  /{page.slug}
                </span>
                <button
                  onClick={() => deleteCustomPage(page.id)}
                  style={{
                    width: '24px', height: '24px', borderRadius: '6px', border: 'none',
                    background: 'transparent', color: 'var(--pl-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Add Custom Page ── */}
      <motion.button
        onClick={() => setShowAddPage(!showAddPage)}
        whileHover={{ y: -1, borderColor: 'rgba(163,177,138,0.4)' }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '10px', borderRadius: '14px', marginTop: '4px',
          border: '1.5px dashed rgba(163,177,138,0.25)',
          background: 'transparent', color: 'var(--pl-olive)',
          cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          transition: 'all 0.15s',
        }}
      >
        <Plus size={13} /> Add Custom Page
      </motion.button>

      <AnimatePresence>
        {showAddPage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '12px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <input
                value={newPageTitle}
                onChange={e => setNewPageTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomPage()}
                placeholder="Page name..."
                autoFocus
                style={{ ...inp, fontSize: '0.82rem' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => { setShowAddPage(false); setNewPageTitle(''); }}
                  style={{
                    flex: 1, padding: '6px', borderRadius: '8px', border: 'none',
                    background: 'rgba(255,255,255,0.2)', color: 'var(--pl-muted)',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={addCustomPage}
                  disabled={!newPageTitle.trim()}
                  style={{
                    flex: 1, padding: '6px', borderRadius: '8px', border: 'none',
                    background: newPageTitle.trim() ? 'var(--pl-olive)' : 'rgba(255,255,255,0.1)',
                    color: newPageTitle.trim() ? 'white' : 'var(--pl-muted)',
                    cursor: newPageTitle.trim() ? 'pointer' : 'default',
                    fontSize: '0.72rem', fontWeight: 600,
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL hint */}
      {subdomain && (
        <div style={{ fontSize: '0.6rem', color: 'var(--pl-muted)', padding: '4px', textAlign: 'center', opacity: 0.6 }}>
          {subdomain}.pearloom.com
        </div>
      )}
    </div>
  );
}
