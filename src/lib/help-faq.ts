// ─────────────────────────────────────────────────────────────
// help-faq — the product Q&A pairs, shared between:
//   • /dashboard/help (HelpClient renders the accordion)
//   • /api/pear-chat  (host-mode system prompt appends a
//     condensed form so Pear answers "how do I…?" accurately)
//
// Pure data + one formatter. No React, no server code — safe to
// import from both client components and route handlers.
// ─────────────────────────────────────────────────────────────

export interface FaqEntry {
  q: string;
  a: string;
  tags: string[];
}

export const HELP_FAQ: FaqEntry[] = [
  { q: 'How do I create my first site?', a: 'From the dashboard, click "New Site" and answer a few questions about your occasion, names, and date. Pear drafts a site in about twenty seconds; you can edit every block after.', tags: ['start', 'site'] },
  { q: 'Can I change the theme after the site is generated?', a: 'Yes. Open the editor and use the Theme panel. Swap fonts, palettes, and the decor library without regenerating. Your words and photos are preserved.', tags: ['theme', 'editor'] },
  { q: 'How do I invite guests to RSVP?', a: 'Open your site in the editor and keep the RSVP block visible. Publish, then share the public URL. Guest responses show up in Dashboard → Guests with meal preferences and plus-ones.', tags: ['rsvp', 'guests'] },
  { q: 'What does the Director do?', a: 'The Director is your AI event planner, budgets, venues, vendors, timelines, and a checklist in one conversation. Open Dashboard → Director and choose a site to get started.', tags: ['director', 'ai'] },
  { q: 'How do photo uploads work?', a: 'Guests upload via the Photo Wall block on your site. You can curate everything in Dashboard → Gallery, hide, star, or download originals. Storage scales with your plan.', tags: ['photos', 'gallery'] },
  { q: 'Can guests leave voice toasts?', a: 'Yes. Add the Guestbook block with voice enabled. Toasts appear in Dashboard → Day-of for you to approve, reject, or feature on the day.', tags: ['guests', 'day-of'] },
  { q: 'How do I publish and share my site?', a: 'In the editor, hit Publish. Your site goes live at pearloom.com/{occasion}/{yourname} (e.g. /wedding/alex-and-jamie) instantly. Attach a custom domain from Dashboard → Profile → Domains.', tags: ['publish', 'domain'] },
  { q: 'What happens after the event?', a: 'Your site stays online forever on every plan, including the free tier. Guests can keep leaving memories, and you can download everything as a keepsake film or zip.', tags: ['after', 'keepsake'] },
  { q: 'Can I collaborate with a partner or planner?', a: 'Yes. Open your site in the editor and press Share, invite a co-host by email. They get a magic link; editors can change everything except Publish, viewers can only look around.', tags: ['team', 'collab'] },
  { q: 'How do I cancel or change my plan?', a: "Dashboard → Profile → Billing. You keep everything you've created on any tier, no lock-in.", tags: ['billing'] },
];

/** Condense the FAQ into a prompt-sized block. Every entry keeps
 *  its full question; answers are trimmed to whole sentences until
 *  they fit a per-entry budget, and the whole block is hard-capped
 *  at `maxChars` (default ~1500) so the system prompt stays lean. */
export function condensedFaqForPrompt(maxChars = 1500): string {
  const perAnswer = Math.max(
    60,
    Math.floor(maxChars / Math.max(1, HELP_FAQ.length)) - 50,
  );
  const lines: string[] = [];
  let used = 0;
  for (const f of HELP_FAQ) {
    const line = `Q: ${f.q} → ${condenseAnswer(f.a, perAnswer)}`;
    if (used + line.length + 1 > maxChars) break;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join('\n');
}

/** Keep whole sentences while they fit `budget`; always keep at
 *  least the first sentence (hard-clipped if it alone overruns). */
function condenseAnswer(answer: string, budget: number): string {
  const sentences = answer.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > budget) break;
    out = next;
  }
  if (!out) out = answer.slice(0, budget).trimEnd();
  return out;
}
