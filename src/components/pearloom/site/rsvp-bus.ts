'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/pearloom/site/rsvp-bus.ts
//
// A tiny published-site coordination layer so an RSVP tap never
// feels dead. Two problems it solves:
//
//   1. The sticky RSVP pill / nav RSVP link are #rsvp anchors. If
//      the host hasn't added an RSVP section, the anchor goes
//      nowhere — a silent dead-end. requestRsvp() opens the
//      standalone GuestRsvpModal instead (it works without a
//      section), or toasts if the modal isn't available.
//   2. Submit / network failures want unmistakable feedback, not
//      just an inline line the guest may have scrolled past.
//
// GuestRsvpModal marks itself ready on mount; the modal is always
// mounted on the published site, so requestRsvp() resolves to
// "open the modal" in practice. The toast path is the safety net
// for the rare unmounted/crashed case.
// ─────────────────────────────────────────────────────────────

let modalReady = false;
let pendingOpen = false;

/** GuestRsvpModal calls this on mount. Returns true when a tap was
 *  queued before the modal came online, so the caller can open now. */
export function markRsvpReady(): boolean {
  modalReady = true;
  const had = pendingOpen;
  pendingOpen = false;
  return had;
}

export function markRsvpUnready(): void {
  modalReady = false;
}

/** Fire a calm, themed toast on the published site. */
export function siteToast(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('pl-site-toast', { detail: { message } }));
}

/** Open the RSVP modal. If it isn't mounted yet (slow hydration),
 *  queue the open + acknowledge; if it never comes online, say so
 *  plainly instead of leaving the tap feeling broken. */
export function requestRsvp(): void {
  if (typeof window === 'undefined') return;
  if (modalReady) {
    window.dispatchEvent(new CustomEvent('pl-open-rsvp'));
    return;
  }
  pendingOpen = true;
  window.setTimeout(() => {
    if (!modalReady) {
      pendingOpen = false;
      siteToast('RSVP isn’t open yet — check back once the hosts have finished setting up.');
    }
  }, 1200);
}
