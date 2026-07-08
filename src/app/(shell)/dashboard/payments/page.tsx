// Retired route (ATELIER-PLAN DR.1): the Stripe-only payments
// ledger duplicated the Registry's unified gift ledger — and in
// launch mode (no Stripe keys) it was an empty dead end. The
// registry page carries payments rows in its merged feed.
import { permanentRedirect } from 'next/navigation';

export default function PaymentsRedirect() {
  permanentRedirect('/dashboard/registry');
}
