import { redirect } from 'next/navigation';

// The roster is called "Guests" everywhere in the product but has
// always lived at /dashboard/rsvp. That mismatch produced a real
// 404 on the publish moment's "Invite your guests" CTA; this
// catches the same guess from bookmarks, typed URLs, and any
// future link that reaches for the obvious name.
export default function Page() {
  redirect('/dashboard/rsvp');
}
