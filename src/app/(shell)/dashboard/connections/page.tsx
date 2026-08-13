// Retired route (ATELIER-PLAN DR.1): linked celebrations live on
// the Weekend page now — one home for "the events around your
// event" (the weekend builder creates the links; this panel
// manages them).
import { permanentRedirect } from 'next/navigation';

export default function ConnectionsRedirect() {
  permanentRedirect('/dashboard/weekend');
}
