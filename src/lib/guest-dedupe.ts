// ─────────────────────────────────────────────────────────────
// Pearloom / lib/guest-dedupe.ts
//
// Spot likely-duplicate guests on the host's list. A guest list
// built from a CSV import + a few hand-adds + RSVPs that minted
// their own row (open RSVP, slightly different spelling) drifts
// into near-duplicates: "Jon Smith" / "John Smith",
// "anna@x.com" entered twice. This groups rows that are probably
// the same person so the dashboard can flag them — it never
// merges anything on its own.
//
// Pure + dependency-free so it can be unit-tested and run
// client-side over the already-loaded guest list (no extra
// fetch). Names only — same information the host already sees.
// ─────────────────────────────────────────────────────────────

export interface DedupeGuest {
  id: string;
  name: string;
  email?: string | null;
}

/** Lowercase, trim, collapse internal whitespace, drop most
 *  punctuation so "Jean-Luc" and "Jean Luc" compare equal. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining accents
    .replace(/[.,'’"`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeEmail(email: string | null | undefined): string {
  const e = (email ?? '').trim().toLowerCase();
  return e && e !== '—' ? e : '';
}

/** Classic iterative Levenshtein edit distance. Small inputs
 *  (guest names), so the O(n·m) table is fine. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Are two normalized names close enough to likely be the same
 *  person? Identical wins; otherwise allow a small edit distance
 *  that scales gently with length (typos, "Jon"/"John", a dropped
 *  middle initial) without collapsing genuinely different names. */
export function namesAreNear(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Very short names (≤3 chars) demand an exact match — at that
  // length a 1-edit window swallows distinct names ("Ann"/"Dan").
  const minLen = Math.min(a.length, b.length);
  if (minLen <= 3) return false;
  const allowed = minLen <= 6 ? 1 : 2;
  return levenshtein(a, b) <= allowed;
}

/** Union-find over the guest list. Two guests link when their
 *  emails match (strongest signal) or their names are near.
 *  Returns groups of 2+ ids, largest first, then by first id for
 *  stable output. */
export function findDuplicateGroups(guests: DedupeGuest[]): string[][] {
  const n = guests.length;
  if (n < 2) return [];

  const parent = guests.map((_, i) => i);
  function find(i: number): number {
    let r = i;
    while (parent[r] !== r) r = parent[r];
    while (parent[i] !== r) { const next = parent[i]; parent[i] = r; i = next; }
    return r;
  }
  function union(i: number, j: number) {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[Math.max(ri, rj)] = Math.min(ri, rj);
  }

  const norm = guests.map((g) => ({
    name: normalizeName(g.name ?? ''),
    email: normalizeEmail(g.email),
  }));

  // Exact-email match is the strongest signal — pre-bucket so it's
  // O(n) rather than O(n²) for the common large list.
  const byEmail = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const e = norm[i].email;
    if (!e) continue;
    const bucket = byEmail.get(e);
    if (bucket) bucket.push(i);
    else byEmail.set(e, [i]);
  }
  for (const bucket of byEmail.values()) {
    for (let k = 1; k < bucket.length; k++) union(bucket[0], bucket[k]);
  }

  // Name proximity — O(n²) over the (typically small) list. Skip
  // pairs already unioned by email.
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (find(i) === find(j)) continue;
      if (namesAreNear(norm[i].name, norm[j].name)) union(i, j);
    }
  }

  const groups = new Map<number, string[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const arr = groups.get(root);
    if (arr) arr.push(guests[i].id);
    else groups.set(root, [guests[i].id]);
  }

  return Array.from(groups.values())
    .filter((g) => g.length >= 2)
    .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}
