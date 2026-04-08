'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Eye, EyeOff, MonitorPlay } from 'lucide-react';
import { lbl, inp } from './editor-utils';
import type { StoryManifest } from '@/types';

// ── Pages Panel ────────────────────────────────────────────────
// Occasion-aware preset pages + user-created custom pages
export type OccasionType = 'wedding' | 'anniversary' | 'engagement' | 'birthday' | 'story';

interface PresetPage {
  id: string; slug: string; label: string; icon: string;
  alwaysOn: boolean;
  occasions: OccasionType[]; // which occasion types this page applies to
}

export const ALL_SITE_PAGES: PresetPage[] = [
  { id: 'home',     slug: '',         label: 'Home',     icon: '', alwaysOn: true,  occasions: ['wedding', 'anniversary', 'engagement', 'birthday', 'story'] },
  { id: 'schedule', slug: 'schedule', label: 'Schedule', icon: '', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'rsvp',     slug: 'rsvp',     label: 'RSVP',     icon: '', alwaysOn: false, occasions: ['wedding', 'engagement', 'birthday'] },
  { id: 'travel',   slug: 'travel',   label: 'Travel',   icon: '', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'venue',    slug: 'venue',    label: 'Venue',    icon: '', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'registry',  slug: 'registry',  label: 'Registry',      icon: '', alwaysOn: false, occasions: ['wedding', 'engagement', 'birthday'] },
  { id: 'faq',       slug: 'faq',       label: 'FAQ',           icon: '', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'guestbook', slug: 'guestbook', label: 'Guest Wishes',  icon: '', alwaysOn: false, occasions: ['wedding', 'anniversary', 'birthday'] },
  { id: 'live',      slug: 'live',      label: 'Day-Of Updates', icon: '', alwaysOn: false, occasions: ['wedding'] },
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

  const togglePageVisibility = (pageId: string) => {
    const hidden = manifest.hiddenPages || [];
    const isHidden = hidden.includes(pageId);
    const next = isHidden ? hidden.filter(id => id !== pageId) : [...hidden, pageId];
    onChange({ ...manifest, hiddenPages: next });
  };

  const enabled = new Set<string>(
    manifest.blocks?.flatMap(b =>
      b.type === 'event' ? ['schedule', 'rsvp'] : [b.type]
    ) || []
  );
  const baseUrl = subdomain ? `https://${subdomain}.pearloom.com` : '';
  const customPages = manifest.customPages || [];

  const addCustomPage = () => {
    if (!newPageTitle.trim()) return;
    const slug = newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newPage = {
      id: `page-${Date.now()}`,
      slug,
      title: newPageTitle.trim(),
      icon: '',
      blocks: [
        { id: `b-text-${Date.now()}`, type: 'text' as const, order: 0, visible: true },
      ],
      visible: true,
      order: customPages.length,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: 'var(--pl-text-base)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted, #9A9488)' }}>
          Site Pages
        </span>
        <button
          onClick={() => setShowAddPage(!showAddPage)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 10px', borderRadius: '5px', border: 'none',
            background: 'var(--pl-olive-20)', color: 'var(--pl-olive, #A3B18A)',
            cursor: 'pointer', fontSize: 'var(--pl-text-base)', fontWeight: 700,
          }}
        >
          <Plus size={11} /> Add Page
        </button>
      </div>

      {/* Add page form */}
      <AnimatePresence>
        {showAddPage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '8px' }}
          >
            <div style={{ background: 'var(--pl-olive-8)', borderRadius: '8px', padding: '10px', border: '1px solid var(--pl-olive-20)' }}>
              <label style={lbl}>Page Name</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  value={newPageTitle}
                  onChange={e => setNewPageTitle(e.target.value)}
                  placeholder="e.g. Our Engagement, The Venue"
                  style={{ ...inp, flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && addCustomPage()}
                />
                <button
                  onClick={addCustomPage}
                  disabled={!newPageTitle.trim()}
                  style={{
                    padding: '6px 12px', borderRadius: '5px', border: 'none',
                    background: newPageTitle.trim() ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-black-6)',
                    color: newPageTitle.trim() ? '#fff' : 'var(--pl-muted)',
                    fontSize: 'var(--pl-text-sm)', fontWeight: 700, cursor: newPageTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >Add</button>
              </div>
              <div style={{ fontSize: 'var(--pl-text-base)', color: 'var(--pl-muted)', marginTop: '4px' }}>
                URL: {baseUrl}/{newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '...'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset pages */}
      <div style={{ fontSize: 'var(--pl-text-sm)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted, #9A9488)', marginBottom: '4px', marginTop: '8px' }}>
        Built-in Pages
      </div>
      {filteredPresets.map(page => {
        const isActive = page.alwaysOn || enabled.has(page.slug) ||
          (page.slug === 'travel' && !!manifest.travelInfo?.hotels?.length) ||
          (page.slug === 'registry' && !!(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl)) ||
          (page.slug === 'faq' && !!(manifest.faqs?.length)) ||
          (page.slug === 'schedule' && !!(manifest.events?.length)) ||
          (page.slug === 'rsvp' && !!(manifest.events?.length)) ||
          (page.slug === 'venue' && !!(manifest.logistics?.venue));
        const url = page.slug === '' ? baseUrl : `${baseUrl}/${page.slug}`;
        const isHidden = !page.alwaysOn && (manifest.hiddenPages || []).includes(page.id);

        return (
          <div key={page.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px 8px 12px', borderRadius: '10px',
            background: isActive && !isHidden ? 'var(--pl-olive-10)' : 'var(--pl-olive-5)',
            border: `1px solid ${isActive && !isHidden ? 'var(--pl-olive-30)' : 'var(--pl-black-4)'}`,
            opacity: isHidden ? 0.4 : 1,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--pl-text-md)', fontWeight: 700, color: isActive && !isHidden ? '#fff' : 'var(--pl-white-50)' }}>{page.label}</div>
              {subdomain && <div style={{ fontSize: 'var(--pl-text-sm)', color: 'var(--pl-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>}
            </div>
            <span style={{
              fontSize: 'var(--pl-text-sm)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: isActive && !isHidden ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-muted)',
              background: isActive && !isHidden ? 'var(--pl-olive-15)' : 'var(--pl-olive-5)',
              padding: '3px 8px', borderRadius: '100px',
            }}>{isActive && !isHidden ? 'Live' : 'Inactive'}</span>
            {onPreviewPage && isActive && !isHidden && (
              <button
                onClick={() => onPreviewPage(previewPage === page.slug ? null : page.slug)}
                title={previewPage === page.slug ? 'Back to homepage preview' : `Preview ${page.label} page`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px', flexShrink: 0,
                  color: previewPage === page.slug ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-muted)',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive, #A3B18A)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = previewPage === page.slug ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-muted)'; }}
              >
                <MonitorPlay size={13} />
              </button>
            )}
            {!page.alwaysOn && (
              <button
                onClick={() => togglePageVisibility(page.id)}
                title={isHidden ? 'Show page' : 'Hide page'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isHidden ? '#f87171' : 'var(--pl-muted)', display: 'flex', padding: '2px', flexShrink: 0 }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = isHidden ? '#fca5a5' : 'var(--pl-ink)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = isHidden ? '#f87171' : 'var(--pl-muted)'; }}
              >
                {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
          </div>
        );
      })}

      {/* Custom pages */}
      {customPages.length > 0 && (
        <>
          <div style={{ fontSize: 'var(--pl-text-sm)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted, #9A9488)', margin: '12px 0 4px' }}>
            Custom Pages
          </div>
          {customPages.map(page => (
            <div key={page.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px 8px 12px', borderRadius: '10px',
              background: 'var(--pl-olive-8)',
              border: '1px solid var(--pl-olive-20)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--pl-text-md)', fontWeight: 700, color: '#fff' }}>{page.title}</div>
                <div style={{ fontSize: 'var(--pl-text-sm)', color: 'var(--pl-muted)', marginTop: '2px' }}>{baseUrl}/{page.slug}</div>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{
                  fontSize: 'var(--pl-text-sm)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--pl-olive, #A3B18A)', background: 'var(--pl-olive-15)', padding: '3px 8px', borderRadius: '100px',
                }}>Live</span>
                {onPreviewPage && (
                  <button
                    onClick={() => onPreviewPage(previewPage === page.slug ? null : page.slug)}
                    title={previewPage === page.slug ? 'Back to homepage preview' : `Preview ${page.title} page`}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px',
                      color: previewPage === page.slug ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-muted)',
                    }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive, #A3B18A)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = previewPage === page.slug ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-muted)'; }}
                  >
                    <MonitorPlay size={13} />
                  </button>
                )}
                <button
                  onClick={() => deleteCustomPage(page.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', padding: '2px' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: '8px', padding: '10px', background: 'var(--pl-olive-5)', borderRadius: '8px', border: '1px dashed var(--pl-olive-20)' }}>
        <p style={{ fontSize: 'var(--pl-text-base)', color: 'var(--pl-olive)', lineHeight: 1.5, margin: 0 }}>
          To activate built-in pages, add content in the <strong style={{ color: 'var(--pl-olive, #A3B18A)' }}>Details</strong> tab. Custom pages can be edited in the <strong style={{ color: 'var(--pl-olive, #A3B18A)' }}>Canvas</strong> tab.
        </p>
      </div>
    </div>
  );
}
