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
  panelLineHeight,
} from './panel';
import type { StoryManifest } from '@/types';
import { formatSiteDisplayUrl } from '@/lib/site-urls';
import { makeId } from '@/lib/editor-ids';

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
  const [addError, setAddError] = useState<string | null>(null);

  const occasion = (manifest.occasion || 'wedding') as OccasionType;
  const filteredPresets = ALL_SITE_PAGES.filter(p => p.occasions.includes(occasion));
  const hidden = new Set(manifest.hiddenPages || []);
  const customPages = manifest.customPages || [];

  const togglePageVisibility = (pageId: string) => {
    const hiddenList = manifest.hiddenPages || [];
    const isHidden = hiddenList.includes(pageId);
    onChange({ ...manifest, hiddenPages: isHidden ? hiddenList.filter(id => id !== pageId) : [...hiddenList, pageId] });
  };

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const reservedSlugs = new Set<string>(
    ALL_SITE_PAGES.map(p => p.slug).filter(Boolean),
  );

  const addCustomPage = () => {
    const trimmed = newPageTitle.trim();
    if (!trimmed) return;
    const slug = slugify(trimmed);
    if (!slug) {
      setAddError('Give the page a name with at least one letter or number.');
      return;
    }
    if (reservedSlugs.has(slug)) {
      setAddError(`"${slug}" is a reserved page — pick a different name.`);
      return;
    }
    if (customPages.some(p => p.slug === slug)) {
      setAddError('You already have a page with that name.');
      return;
    }
    const newPage = {
      id: makeId('page'), slug,
      title: trimmed, icon: '',
      blocks: [{ id: makeId('b-text'), type: 'text' as const, order: 0, visible: true }],
      visible: true, order: customPages.length,
    };
    onChange({ ...manifest, customPages: [...customPages, newPage] });
    setNewPageTitle('');
    setAddError(null);
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
                  borderRadius: '8px',
                  background: isHidden ? '#FAFAFA' : '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  transition: 'all 0.15s',
                  opacity: isHidden ? 0.5 : 1,
                }}
              >
                <span style={{
                  flex: 1,
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: isHidden ? '#71717A' : '#18181B',
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
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
                      background: previewPage === page.slug ? '#F4F4F5' : 'transparent',
                      color: previewPage === page.slug ? '#18181B' : '#71717A',
                      cursor: 'pointer',
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
                      color: isHidden ? '#e87070' : '#71717A',
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
                  borderRadius: '8px',
                  background: '#FAFAFA',
                  border: '1px solid #E4E4E7',
                }}
              >
                <span style={{
                  flex: 1,
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: '#18181B',
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
                }}>
                  {page.title}
                </span>
                <span style={{
                  fontSize: panelText.meta,
                  color: '#71717A',
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
                }}>
                  /{page.slug}
                </span>
                <button
                  onClick={() => deleteCustomPage(page.id)}
                  style={{
                    width: '24px', height: '24px', borderRadius: '6px', border: 'none',
                    background: 'transparent', color: '#71717A', cursor: 'pointer',
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
          whileHover={{ y: -1, borderColor: '#18181B' }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '10px', width: '100%',
            border: '1.5px dashed #E4E4E7',
            background: '#FAFAFA', color: '#18181B',
            cursor: 'pointer',
            fontSize: panelText.body,
            fontWeight: panelWeight.bold,
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.tight,
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
                  onChange={(v) => { setNewPageTitle(v); if (addError) setAddError(null); }}
                  placeholder="Page name..."
                />
                {addError && (
                  <div
                    role="alert"
                    style={{
                      fontSize: '0.7rem',
                      lineHeight: 1.5,
                      color: 'var(--pl-plum)',
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: 'color-mix(in oklab, var(--pl-plum) 10%, transparent)',
                      border: '1px solid color-mix(in oklab, var(--pl-plum) 30%, transparent)',
                    }}
                  >
                    {addError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => { setShowAddPage(false); setNewPageTitle(''); }}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '8px',
                      border: '1px solid #E4E4E7',
                      background: '#FFFFFF', color: '#71717A',
                      cursor: 'pointer',
                      fontSize: panelText.body,
                      fontWeight: panelWeight.semibold,
                      fontFamily: 'inherit',
                      lineHeight: panelLineHeight.tight,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomPage}
                    disabled={!newPageTitle.trim()}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '8px', border: 'none',
                      background: newPageTitle.trim() ? '#18181B' : '#E4E4E7',
                      color: newPageTitle.trim() ? '#FFFFFF' : '#71717A',
                      cursor: newPageTitle.trim() ? 'pointer' : 'default',
                      fontSize: panelText.body,
                      fontWeight: panelWeight.bold,
                      fontFamily: 'inherit',
                      lineHeight: panelLineHeight.tight,
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
            color: '#71717A',
            fontFamily: 'inherit',
            padding: '12px 4px 0',
            textAlign: 'center',
            lineHeight: panelLineHeight.snug,
          }}>
            {formatSiteDisplayUrl(subdomain, '', occasion)}
          </div>
        )}
      </PanelSection>
    </PanelRoot>
  );
}
