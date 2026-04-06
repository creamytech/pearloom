// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/template.ts
// Mini template engine — Liquid-like syntax for advanced text.
//
// Supported syntax:
//   {{ variable }}           — value interpolation
//   {% if variable %}...{% endif %}  — conditional
//   {% unless variable %}...{% endunless %} — negative conditional
//   {{ variable | upcase }}  — filter: uppercase
//   {{ variable | downcase }}— filter: lowercase
//   {{ variable | capitalize }} — capitalize first letter
//   {{ variable | truncate: 50 }} — truncate with ellipsis
//   {{ variable | default: "fallback" }} — default value
//   {{ variable | date: "MMMM D, YYYY" }} — date formatting
//
// Safe: no eval(), no arbitrary code, no loops (prevents abuse).
// ─────────────────────────────────────────────────────────────

import { type BindingContext, resolveBindings } from './bindings';

// ── Filters ──────────────────────────────────────────────────

type FilterFn = (value: string, arg?: string) => string;

const FILTERS: Record<string, FilterFn> = {
  upcase: (v) => v.toUpperCase(),
  downcase: (v) => v.toLowerCase(),
  capitalize: (v) => v.charAt(0).toUpperCase() + v.slice(1),

  truncate: (v, arg) => {
    const len = parseInt(arg || '50', 10);
    return v.length > len ? v.slice(0, len) + '...' : v;
  },

  default: (v, arg) => {
    const fallback = arg?.replace(/^["']|["']$/g, '') || '';
    return v.trim() ? v : fallback;
  },

  date: (v, arg) => {
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return v;
      const format = arg?.replace(/^["']|["']$/g, '') || 'long';
      if (format === 'long') return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      if (format === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (format === 'year') return String(d.getFullYear());
      // Custom: "Month Day, Year" style
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return v;
    }
  },

  strip: (v) => v.trim(),
  escape: (v) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)),
};

/**
 * Apply a filter chain to a value.
 * Parses: "value | filter1 | filter2: arg"
 */
function applyFilters(value: string, filterChain: string): string {
  const filters = filterChain.split('|').map(f => f.trim()).filter(Boolean);
  let result = value;

  for (const filter of filters) {
    const colonIdx = filter.indexOf(':');
    const name = colonIdx >= 0 ? filter.slice(0, colonIdx).trim() : filter.trim();
    const arg = colonIdx >= 0 ? filter.slice(colonIdx + 1).trim() : undefined;

    const fn = FILTERS[name];
    if (fn) {
      result = fn(result, arg);
    }
  }

  return result;
}

// ── Template rendering ───────────────────────────────────────

/**
 * Resolve {{ variable | filter }} expressions with filter support.
 */
function resolveWithFilters(template: string, context: BindingContext): string {
  return template.replace(/\{\{\s*([\w.]+)(\s*\|[^}]+)?\s*\}\}/g, (match, path, filterStr) => {
    // Resolve the value from context
    const parts = path.split('.');
    let current: unknown = context;
    for (const part of parts) {
      if (current === null || current === undefined) return match;
      if (typeof current !== 'object') return match;
      current = (current as Record<string, unknown>)[part];
    }

    if (current === undefined || current === null) return match;

    let strValue = typeof current === 'string' ? current
      : typeof current === 'number' || typeof current === 'boolean' ? String(current)
      : Array.isArray(current) ? current.join(', ')
      : match;

    // Apply filters if present
    if (filterStr) {
      strValue = applyFilters(strValue, filterStr);
    }

    return strValue;
  });
}

/**
 * Process {% if variable %}...{% endif %} conditionals.
 */
function processConditionals(template: string, context: BindingContext): string {
  // {% if variable %}content{% endif %}
  let result = template.replace(
    /\{%\s*if\s+([\w.]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
    (_, path, content) => {
      const parts = path.split('.');
      let current: unknown = context;
      for (const part of parts) {
        if (current === null || current === undefined) return '';
        if (typeof current !== 'object') return '';
        current = (current as Record<string, unknown>)[part];
      }
      // Truthy check
      if (current && current !== '' && current !== 0 && current !== false) {
        return content;
      }
      return '';
    }
  );

  // {% unless variable %}content{% endunless %}
  result = result.replace(
    /\{%\s*unless\s+([\w.]+)\s*%\}([\s\S]*?)\{%\s*endunless\s*%\}/g,
    (_, path, content) => {
      const parts = path.split('.');
      let current: unknown = context;
      for (const part of parts) {
        if (current === null || current === undefined) { return content; } // falsy → show
        if (typeof current !== 'object') { return content; }
        current = (current as Record<string, unknown>)[part];
      }
      if (!current || current === '' || current === 0 || current === false) {
        return content;
      }
      return '';
    }
  );

  return result;
}

/**
 * Render a template string with the full Pearloom template engine.
 *
 * Supports: {{ bindings }}, {{ bindings | filters }}, {% if %}...{% endif %}
 *
 * @example
 * renderTemplate(
 *   '{% if logistics.date %}Save the date: {{ logistics.date | date: "long" }}{% endif %}',
 *   context
 * )
 * // → "Save the date: June 15, 2025"
 */
export function renderTemplate(template: string, context: BindingContext): string {
  // Step 1: Process conditionals
  let result = processConditionals(template, context);

  // Step 2: Resolve bindings with filters
  result = resolveWithFilters(result, context);

  return result;
}
