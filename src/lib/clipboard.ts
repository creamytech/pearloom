// ─────────────────────────────────────────────────────────────
// Pearloom / lib/clipboard.ts
//
// Reliable clipboard writes with a graceful fallback for
// insecure contexts (http://, in-app browsers) where the async
// Clipboard API is unavailable. Returns `true` on success so
// callers can branch their UI feedback accordingly instead of
// flashing "Copied!" when nothing was written.
// ─────────────────────────────────────────────────────────────

export async function writeClipboardText(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function' &&
      window.isSecureContext !== false
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand fallback
  }

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.top = '-1000px';
    el.style.left = '-1000px';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
