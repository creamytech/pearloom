import { redirect } from 'next/navigation';

// The old marketplace surface that backed /templates has been
// retired. The Theme Store at /store is its replacement — theme
// packs reskin a site, which is closer to what hosts were using
// the marketplace tiles for anyway. Any deep-link still works by
// landing on the Theme Store.
export default function TemplatesPage() {
  redirect('/store');
}
