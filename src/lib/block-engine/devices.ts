// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/devices.ts
// Device breakpoint presets for responsive preview.
// Extends the basic desktop/tablet/mobile with specific devices.
// ─────────────────────────────────────────────────────────────

export interface DevicePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  category: 'desktop' | 'tablet' | 'mobile';
  /** If true, show device chrome (notch, home bar) */
  showChrome?: boolean;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  // Desktop
  { id: 'desktop-full',   label: 'Desktop',        width: 1440, height: 900,  category: 'desktop' },
  { id: 'desktop-laptop', label: 'Laptop',          width: 1280, height: 800,  category: 'desktop' },
  { id: 'desktop-small',  label: 'Small Desktop',   width: 1024, height: 768,  category: 'desktop' },

  // Tablet
  { id: 'ipad-pro',       label: 'iPad Pro',        width: 1024, height: 1366, category: 'tablet', showChrome: true },
  { id: 'ipad',           label: 'iPad',            width: 810,  height: 1080, category: 'tablet', showChrome: true },
  { id: 'ipad-mini',      label: 'iPad Mini',       width: 744,  height: 1133, category: 'tablet', showChrome: true },
  { id: 'tablet-land',    label: 'Tablet Landscape', width: 1080, height: 810, category: 'tablet', showChrome: true },

  // Mobile
  { id: 'iphone-15-pro',  label: 'iPhone 15 Pro',   width: 393,  height: 852,  category: 'mobile', showChrome: true },
  { id: 'iphone-15',      label: 'iPhone 15',       width: 390,  height: 844,  category: 'mobile', showChrome: true },
  { id: 'iphone-se',      label: 'iPhone SE',       width: 375,  height: 667,  category: 'mobile', showChrome: true },
  { id: 'pixel-8',        label: 'Pixel 8',         width: 412,  height: 915,  category: 'mobile', showChrome: true },
  { id: 'galaxy-s24',     label: 'Galaxy S24',      width: 360,  height: 780,  category: 'mobile', showChrome: true },
];

export function getPreset(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find(d => d.id === id);
}

export function getPresetsByCategory(category: 'desktop' | 'tablet' | 'mobile'): DevicePreset[] {
  return DEVICE_PRESETS.filter(d => d.category === category);
}
