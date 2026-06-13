 
/* Link-target catalog — shared by every panel that needs a
   "where does this link go?" dropdown. Section ids must match the
   `SectionKind` union in ThemedSite.tsx; the renderer mounts each
   section as <div id={kind}> so #section anchors scroll properly.

   When a panel writes a link target as a value, store it verbatim:
     - '#story', '#rsvp', etc.   → in-site anchor
     - 'https://…'                → external URL
     - ''                          → no link (button is decorative)

   Use resolveLinkLabel() to compute the default visible label when
   the host hasn't set one — keeps the panel from showing an empty
   button. */

export interface LinkTarget {
  value: string;        // '#story' | 'https://...' | '' | 'custom'
  label: string;        // 'Our story' — also the default button label
  hint?: string;        // sub-line for FSelect — '#story' / 'External URL'
}

/** Curated list of in-site anchors. Order matches reading order on
 *  the canvas so the dropdown reads like a table of contents. */
export const SECTION_LINK_TARGETS: LinkTarget[] = [
  { value: '#story',    label: 'Our story',  hint: 'Story section' },
  { value: '#details',  label: 'Details',    hint: 'Details section' },
  { value: '#schedule', label: 'Schedule',   hint: 'Schedule section' },
  { value: '#travel',   label: 'Travel',     hint: 'Travel section' },
  { value: '#registry', label: 'Registry',   hint: 'Registry section' },
  { value: '#gallery',  label: 'Gallery',    hint: 'Gallery section' },
  { value: '#rsvp',     label: 'RSVP',       hint: 'RSVP section' },
  { value: '#faq',      label: 'FAQ',        hint: 'FAQ section' },
];

/** Special-case targets that aren't section anchors. */
export const SPECIAL_LINK_TARGETS: LinkTarget[] = [
  { value: 'rsvp-modal', label: 'Open RSVP form', hint: 'Opens the RSVP modal' },
  { value: 'custom',     label: 'Custom URL…',    hint: 'Paste any link' },
  { value: 'none',       label: 'No link (just a label)', hint: 'Decorative only' },
];

/** Common registry / honeymoon-fund destinations. URL is a public
 *  homepage by default; host can still override via Custom. */
export const REGISTRY_STORE_TARGETS: LinkTarget[] = [
  { value: 'amazon',          label: 'Amazon',          hint: 'amazon.com/wedding' },
  { value: 'crate-and-barrel',label: 'Crate & Barrel',  hint: 'crateandbarrel.com' },
  { value: 'williams-sonoma', label: 'Williams Sonoma', hint: 'williams-sonoma.com' },
  { value: 'west-elm',        label: 'West Elm',        hint: 'westelm.com' },
  { value: 'pottery-barn',    label: 'Pottery Barn',    hint: 'potterybarn.com' },
  { value: 'target',          label: 'Target',          hint: 'target.com/gift-registry' },
  { value: 'zola',            label: 'Zola',            hint: 'zola.com' },
  { value: 'the-knot',        label: 'The Knot',        hint: 'theknot.com/registry' },
  { value: 'honeyfund',       label: 'Honeyfund',       hint: 'honeyfund.com' },
  { value: 'rei',             label: 'REI',             hint: 'rei.com' },
];

/** Default homepage URL per known store id. */
export const REGISTRY_STORE_URLS: Record<string, string> = {
  'amazon':           'https://www.amazon.com/wedding',
  'crate-and-barrel': 'https://www.crateandbarrel.com',
  'williams-sonoma':  'https://www.williams-sonoma.com',
  'west-elm':         'https://www.westelm.com',
  'pottery-barn':     'https://www.potterybarn.com',
  'target':           'https://www.target.com/gift-registry',
  'zola':             'https://www.zola.com',
  'the-knot':         'https://www.theknot.com',
  'honeyfund':        'https://www.honeyfund.com',
  'rei':              'https://www.rei.com',
};

/** Resolve a link value to its default human label. Falls back to
 *  the value itself for unknown custom URLs. */
export function resolveLinkLabel(value: string): string {
  if (!value) return '';
  const all = [...SECTION_LINK_TARGETS, ...SPECIAL_LINK_TARGETS];
  const match = all.find((t) => t.value === value);
  if (match) return match.label;
  return value;
}
