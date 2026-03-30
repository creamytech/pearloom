// ─────────────────────────────────────────────────────────────
// Pearloom / lib/sanitize-svg.ts
// Robust SVG sanitization for AI-generated and user-supplied SVG content.
// Removes scripts, event handlers, external references, and dangerous elements.
// ─────────────────────────────────────────────────────────────

const DANGEROUS_TAGS = /(<script[\s\S]*?<\/script>|<iframe[\s\S]*?<\/iframe>|<object[\s\S]*?<\/object>|<embed[\s\S]*?<\/embed>|<foreignObject[\s\S]*?<\/foreignObject>)/gi;
const EVENT_HANDLERS = /\s+on\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URLS = /(href|xlink:href|src|action|formaction)\s*=\s*["']\s*javascript\s*:[^"']*["']/gi;
const DATA_URLS = /(href|xlink:href|src)\s*=\s*["']\s*data\s*:\s*(?!image\/(svg\+xml|png|jpeg|gif|webp))[^"']*["']/gi;
const EXTERNAL_REFS = /xlink:href\s*=\s*["'](?!#)[^"']*["']/gi;
const EXTERNAL_USE = /<use[^>]+href\s*=\s*["'][^#][^"']*["'][^>]*\/?>/gi;
const BASE_ELEMENTS = /<base[^>]*\/?>/gi;
const META_ELEMENTS = /<meta[^>]*\/?>/gi;

export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  return svg
    .replace(DANGEROUS_TAGS, '')
    .replace(EVENT_HANDLERS, '')
    .replace(JAVASCRIPT_URLS, '')
    .replace(DATA_URLS, '')
    .replace(EXTERNAL_REFS, '')
    .replace(EXTERNAL_USE, '')
    .replace(BASE_ELEMENTS, '')
    .replace(META_ELEMENTS, '');
}
