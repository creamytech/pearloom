// ─────────────────────────────────────────────────────────────
// Pearloom / scripts/upload-hero-art.ts
// Generates all 49 hero SVGs and uploads them to R2.
// Run: npx tsx scripts/upload-hero-art.ts
// ─────────────────────────────────────────────────────────────

import { SITE_TEMPLATES } from '../src/lib/templates/wedding-templates';
import { generateHeroIllustration } from '../src/lib/hero-illustrations';
import { uploadSvg, getR2Url } from '../src/lib/r2';

async function main() {
  console.log(`Generating and uploading hero art for ${SITE_TEMPLATES.length} templates...\n`);

  const results: Record<string, string> = {};

  for (const template of SITE_TEMPLATES) {
    const svg = generateHeroIllustration(template.id, {
      background: template.theme.colors.background,
      accent: template.theme.colors.accent,
      accent2: template.theme.colors.accentLight,
      foreground: template.theme.colors.foreground,
    });

    const key = `heroes/${template.id}.svg`;

    try {
      const url = await uploadSvg(key, svg);
      results[template.id] = url;
      console.log(`✓ ${template.id} → ${url}`);
    } catch (err) {
      console.error(`✗ ${template.id} — ${err}`);
      // Fallback: use data URL
      const b64 = Buffer.from(svg).toString('base64');
      results[template.id] = `data:image/svg+xml;base64,${b64}`;
    }
  }

  console.log('\n── Results ──');
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nDone. ${Object.keys(results).length} heroes processed.`);
  console.log('\nCopy the URLs above and update coverPhoto in wedding-templates.ts');
}

main().catch(console.error);
