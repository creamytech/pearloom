'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Eye, EyeOff, ExternalLink, FileText, Layout } from 'lucide-react';
import {
  PanelRoot,
  PanelSection,
  PanelInput,
  panelText,
  panelWeight,
} from './panel';
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

  const visiblePresetCount = filteredPresets.filter(p => !hidden.has(p.id)).length;

  return (
    <PanelRoot>
      <PanelSection
        title="Site Pages"
        icon={Layout}
        badge={visiblePresetCount + customPages.length}
        hint="Preset pages follow your occasion. Hide what you don't need, add custom ones as needed."
        card={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                <span style={{
                  flex: 1,
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: isHidden ? 'var(--pl-muted)' : 'var(--pl-ink)',
                  textDecoration: isHidden ? 'line-through' : 'none',
                }}>
                  {page.label}
                </span>

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
      </PanelSection>

      {customPages.length > 0 && (
        <PanelSection title="Custom Pages" icon={FileText} badge={customPages.length} card={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                <span style={{
                  flex: 1,
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: 'var(--pl-ink)',
                }}>
                  {page.title}
                </span>
                <span style={{ fontSize: panelText.meta, color: 'var(--pl-muted)' }}>
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
        </PanelSection>
      )}

      <PanelSection title="Add Page" icon={Plus} defaultOpen={false}>
        <motion.button
          onClick={() => setShowAddPage(!showAddPage)}
          whileHover={{ y: -1, borderColor: 'rgba(163,177,138,0.4)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '14px', width: '100%',
            border: '1.5px dashed rgba(163,177,138,0.25)',
            background: 'transparent', color: 'var(--pl-olive)',
            cursor: 'pointer',
            fontSize: panelText.chip,
            fontWeight: panelWeight.semibold,
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
              style={{ overflow: 'hidden', marginTop: '10px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <PanelInput
                  value={newPageTitle}
                  onChange={setNewPageTitle}
                  placeholder="Page name..."
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => { setShowAddPage(false); setNewPageTitle(''); }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                      background: 'rgba(255,255,255,0.4)', color: 'var(--pl-muted)',
                      cursor: 'pointer',
                      fontSize: panelText.chip,
                      fontWeight: panelWeight.semibold,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomPage}
                    disabled={!newPageTitle.trim()}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                      background: newPageTitle.trim() ? 'var(--pl-olive)' : 'rgba(255,255,255,0.2)',
                      color: newPageTitle.trim() ? 'white' : 'var(--pl-muted)',
                      cursor: newPageTitle.trim() ? 'pointer' : 'default',
                      fontSize: panelText.chip,
                      fontWeight: panelWeight.bold,
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {subdomain && (
          <div style={{
            fontSize: panelText.meta,
            color: 'var(--pl-muted)',
            padding: '10px 4px 0',
            textAlign: 'center',
            opacity: 0.6,
          }}>
            {subdomain}.pearloom.com
          </div>
        )}
      </PanelSection>
    </PanelRoot>
  );
}
