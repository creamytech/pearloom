// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/film.ts
//
// Post-event film pipeline (Phase 1: scaffold).
//
// The film pipeline is split into four stages. Each stage is
// an isolated, idempotent unit so we can parallelize + retry:
//
//   1. GATHER     — collect guest photos, voice toasts, and
//                   structured event moments from the DB
//   2. SCRIPT     — Claude Opus writes narration anchored to
//                   the relationship graph + manifest chapters
//   3. VO         — ElevenLabs (or similar) synthesizes the VO
//   4. RENDER     — headless ffmpeg worker stitches photos +
//                   VO + music → .mp4 and uploads to R2
//
// This file only implements stages 1 + 2 + the job wrapper.
// Stages 3 + 4 are invoked by a queue worker (out of scope here)
// but the status machine is wired end to end so a worker can be
// dropped in without schema churn.
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { generateJson, cached } from '@/lib/claude';
import type { StoryManifest } from '@/types';
import type { PearloomGuest, RelationshipEdge, VoiceToast } from './db';

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export type FilmStatus =
  | 'queued'
  | 'gathering'
  | 'scripting'
  | 'rendering'
  | 'ready'
  | 'failed';

export interface FilmJob {
  id: string;
  site_id: string;
  event_id: string | null;
  owner_email: string;
  status: FilmStatus;
  script: string | null;
  output_url: string | null;
  duration_seconds: number | null;
  error: string | null;
  metadata: Record<string, unknown>;
}

// ── Job creation ────────────────────────────────────────────────

export async function createFilmJob(input: {
  siteId: string;
  eventId?: string | null;
  ownerEmail: string;
}): Promise<FilmJob> {
  const { data, error } = await admin()
    .from('post_event_films')
    .insert({
      site_id: input.siteId,
      event_id: input.eventId ?? null,
      owner_email: input.ownerEmail,
      status: 'queued' as FilmStatus,
    })
    .select()
    .single();
  if (error) throw error;
  return data as FilmJob;
}

export async function getFilmJob(id: string): Promise<FilmJob | null> {
  const { data } = await admin()
    .from('post_event_films')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data ?? null) as FilmJob | null;
}

export async function listFilmJobs(siteId: string): Promise<FilmJob[]> {
  const { data, error } = await admin()
    .from('post_event_films')
    .select('*')
    .eq('site_id', siteId)
    .order('started_at', { ascending: false, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as FilmJob[];
}

async function setStatus(id: string, status: FilmStatus, patch: Partial<FilmJob> = {}) {
  const now = new Date().toISOString();
  const timePatch: Record<string, unknown> = {};
  if (status === 'gathering') timePatch.started_at = now;
  if (status === 'ready' || status === 'failed') timePatch.completed_at = now;
  const { error } = await admin()
    .from('post_event_films')
    .update({ status, ...timePatch, ...patch })
    .eq('id', id);
  if (error) throw error;
}

// ── Stage 1: Gather ──────────────────────────────────────────────

export interface FilmSources {
  manifest: StoryManifest | null;
  guests: PearloomGuest[];
  edges: RelationshipEdge[];
  toasts: VoiceToast[];
  photoUrls: string[];
}

async function gatherSources(siteId: string): Promise<FilmSources> {
  const sb = admin();

  const [siteRes, guestsRes, edgesRes, toastsRes, photosRes] = await Promise.all([
    sb.from('sites').select('site_config').eq('id', siteId).maybeSingle(),
    sb.from('pearloom_guests').select('*').eq('site_id', siteId),
    sb.from('relationship_graph').select('*').eq('site_id', siteId),
    sb
      .from('voice_toasts')
      .select('*')
      .eq('site_id', siteId)
      .eq('moderation_status', 'approved'),
    sb
      .from('photos')
      .select('url')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true })
      .limit(120),
  ]);

  const manifest = (siteRes.data?.site_config as { manifest?: StoryManifest } | null)?.manifest ?? null;
  return {
    manifest,
    guests: (guestsRes.data ?? []) as PearloomGuest[],
    edges: (edgesRes.data ?? []) as RelationshipEdge[],
    toasts: (toastsRes.data ?? []) as VoiceToast[],
    photoUrls: ((photosRes.data ?? []) as Array<{ url: string }>).map((p) => p.url).filter(Boolean),
  };
}

// ── Stage 2: Script ──────────────────────────────────────────────

export interface FilmScript {
  title: string;
  estimatedDurationSeconds: number;
  scenes: Array<{
    id: string;
    voiceover: string;
    photoGuidance: string;
    durationSeconds: number;
    calloutGuestIds?: string[];
  }>;
}

async function writeScript(sources: FilmSources): Promise<FilmScript> {
  const { manifest, guests, edges, toasts } = sources;
  const guestIndex = new Map(guests.map((g) => [g.id, g.display_name]));

  const siteContext = JSON.stringify({
    occasion: manifest?.occasion,
    coupleId: manifest?.coupleId,
    vibe: manifest?.vibeString,
    venue: manifest?.logistics?.venue,
    chapters: (manifest?.chapters ?? []).slice(0, 8).map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.description?.slice(0, 300),
    })),
  });

  const relationshipContext = JSON.stringify(
    edges.slice(0, 40).map((e) => ({
      from: e.from_guest_id ? guestIndex.get(e.from_guest_id) : null,
      to: e.to_guest_id ? guestIndex.get(e.to_guest_id) : null,
      kind: e.kind,
      closeness: e.closeness,
      story: e.story?.slice(0, 200),
    }))
  );

  const toastContext = JSON.stringify(
    toasts.slice(0, 20).map((t) => ({
      from: t.guest_display_name,
      transcript: (t.transcript_cleaned || t.transcript || '').slice(0, 400),
    }))
  );

  return generateJson<FilmScript>({
    tier: 'opus',
    temperature: 0.8,
    maxTokens: 3200,
    system: cached(
      `You are Pearloom's film director. You write narration for a 3-6 minute post-event film. The film is a gift to the couple — it revisits the day through specific people, specific moments, and the stories that connect them. Never generic. Never sappy. Always grounded in details you were given.`,
      '1h'
    ) as unknown as string,
    messages: [
      {
        role: 'user',
        content: `SITE CONTEXT:
${siteContext}

RELATIONSHIP GRAPH (people who mean something to the couple):
${relationshipContext}

VOICE TOASTS (excerpts of what guests said):
${toastContext}

Write a shooting script for a 4-minute post-event film. Aim for 8-14 scenes.
- Each scene has 1-3 sentences of voiceover (calm, specific, cinematic — written for performance, not page)
- Each scene has photoGuidance: the kind of photo the renderer should pick (e.g. "wide shot of first dance", "close-up of Priya laughing")
- Total durations should sum to ~240 seconds (=4 minutes)
- Weave in 2-3 actual lines from the voice toasts verbatim, attributed in the voiceover text
- Reference people by first name, grounded in the relationship graph where possible
- calloutGuestIds: guests whose photos/moments this scene needs`,
      },
    ],
    schemaName: 'emit_film_script',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        estimatedDurationSeconds: { type: 'number' },
        scenes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              voiceover: { type: 'string' },
              photoGuidance: { type: 'string' },
              durationSeconds: { type: 'number' },
              calloutGuestIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'voiceover', 'photoGuidance', 'durationSeconds'],
          },
        },
      },
      required: ['title', 'estimatedDurationSeconds', 'scenes'],
    },
  });
}

// ── Orchestrator: runs the stages that are safe on a web node ────
// (Stages 3 + 4 run in a separate worker — this function prepares
// everything they need and flips the status to 'rendering' so the
// worker can pick it up.)

export async function advanceFilmJob(jobId: string): Promise<void> {
  const job = await getFilmJob(jobId);
  if (!job) throw new Error('Film job not found');
  if (job.status === 'ready' || job.status === 'failed') return;

  try {
    if (job.status === 'queued') {
      await setStatus(jobId, 'gathering');
    }

    const sources = await gatherSources(job.site_id);
    if (!sources.manifest) throw new Error('Site has no manifest yet');
    if (sources.guests.length === 0) throw new Error('No guests on file');

    await setStatus(jobId, 'scripting');
    const script = await writeScript(sources);

    await setStatus(jobId, 'rendering', {
      script: script.scenes.map((s) => `[${s.id}] ${s.voiceover}`).join('\n\n'),
      duration_seconds: Math.round(script.estimatedDurationSeconds),
      metadata: {
        ...(job.metadata ?? {}),
        script,
        sourceCounts: {
          guests: sources.guests.length,
          edges: sources.edges.length,
          toasts: sources.toasts.length,
          photos: sources.photoUrls.length,
        },
      },
    });
  } catch (err) {
    await setStatus(jobId, 'failed', { error: String(err).slice(0, 500) });
    throw err;
  }
}
