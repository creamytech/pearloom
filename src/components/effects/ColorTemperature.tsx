'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/ColorTemperature.tsx
// Injects a CSS filter on the page wrapper to shift color
// temperature. Negative values push cool/blue, positive push
// warm/amber. Range: −50 → +50.
// ─────────────────────────────────────────────────────────────

interface ColorTemperatureProps {
  value: number; // -50 to +50
}

export function ColorTemperature({ value }: ColorTemperatureProps) {
  if (value === 0) return null;

  const abs = Math.abs(value);
  const normalised = abs / 50; // 0→1

  let filter = '';
  if (value > 0) {
    // Warm: nudge hue slightly toward orange, boost saturation, add sepia tint
    const hueRotate = -(normalised * 12); // negative = toward red/orange
    const sepia = normalised * 0.25;
    const saturate = 1 + normalised * 0.25;
    filter = `sepia(${sepia.toFixed(3)}) saturate(${saturate.toFixed(3)}) hue-rotate(${hueRotate.toFixed(1)}deg)`;
  } else {
    // Cool: nudge hue toward cyan/blue, desaturate slightly
    const hueRotate = normalised * 18; // positive = toward blue
    const saturate = 1 - normalised * 0.12;
    filter = `saturate(${saturate.toFixed(3)}) hue-rotate(${hueRotate.toFixed(1)}deg)`;
  }

  return (
    <style>{`
      [data-pl-site-root] {
        filter: ${filter};
        transition: filter 0.6s ease;
      }
    `}</style>
  );
}
