'use client';

/* eslint-disable no-restricted-syntax */
/* MapPanel — host config for the Map section. Reads the venue
   from manifest.logistics.venue + optional manifest.logistics.address.
   Writes manifest.mapBlock = { variant, height, showDirections }.
   The DEFAULT layout is the drawn map plate (map-plate.tsx) in the
   site's own tints; the 'embed'/'split'/'postcard' layouts use
   Google Maps' free no-key iframe at maps.google.com/?output=embed
   (works without a billing-enabled API key). */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { FSelect } from './_form-atoms';

/* MapPanel — Content tab fields only. The layout variant
   (plate / embed / pin / split / postcard) is picked in the
   Layout tab via the LAYOUTS registry. */
interface MapData {
  height?: 'short' | 'tall';
  showDirections?: boolean;
  /** Override the auto-derived venue address used for the embed.
   *  Hosts with weird venue names (just "Casa Chorro") can paste
   *  a full address here so the map actually finds it. */
  addressOverride?: string;
}

export function MapPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'map');
  const loose = manifest as unknown as { mapBlock?: MapData };
  const data: MapData = loose.mapBlock ?? {};
  const height = data.height ?? 'short';
  const showDirections = data.showDirections ?? true;
  const venue = manifest.logistics?.venue ?? '';
  const place = (manifest.logistics as { place?: string } | undefined)?.place ?? '';
  const derivedAddress = [venue, place].filter(Boolean).join(', ');
  const address = data.addressOverride?.trim() || derivedAddress;
  const [eyebrow, setEyebrow] = useCopyOverride(manifest, onChange, 'mapEyebrow');

  const patch = (next: Partial<MapData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    mapBlock: { ...data, ...next },
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!address && (
          <div style={{
            padding: 10, borderRadius: 10,
            background: 'var(--peach-bg)',
            border: '1px solid rgba(198,112,61,0.18)',
            fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5,
          }}>
            Set a venue in the Hero panel, the map needs an address to plot.
          </div>
        )}

        <FGroup label="Eyebrow" hint="Tiny label above the map.">
          <FInput value={eyebrow} onChange={setEyebrow} placeholder="Where it's happening" />
        </FGroup>

        <FGroup label="Address" hint="We try to derive this from your venue. Override if Google can't find it.">
          <FInput
            value={data.addressOverride ?? ''}
            onChange={(v) => patch({ addressOverride: v })}
            icon="pin"
            placeholder={derivedAddress || 'Full address for the map'}
          />
          {address && (
            <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--ink-muted)' }}>
              Plotting: <strong>{address}</strong>
            </div>
          )}
        </FGroup>

        <FGroup label="Height" hint="Applies to the live-map layouts; the drawn map and pin card size themselves.">
          <FSelect
            value={height}
            onChange={(v) => patch({ height: v as 'short' | 'tall' })}
            options={[
              { value: 'short', label: 'Short',  hint: '~320 px tall' },
              { value: 'tall', label: 'Tall', hint: '~560 px tall, feels like a full map page' },
            ]}
          />
        </FGroup>

        <FToggleStandalone
          label="Show directions button"
          sub={showDirections ? 'Opens the guest’s maps app in a new tab' : 'No button — guests copy the address'}
          def={showDirections}
          onChange={(v) => patch({ showDirections: v })}
        />

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Map" />
      </div>
    </SectionPanelShell>
  );
}

export default MapPanel;
