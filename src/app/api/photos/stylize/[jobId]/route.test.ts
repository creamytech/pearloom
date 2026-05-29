// ─────────────────────────────────────────────────────────────
// Pearloom / api/photos/stylize/[jobId]/route.test.ts
//
// Phase 2.9 (companion to stylize/route.test.ts). The polling
// endpoint is owner-scoped: getJob(id, ownerEmail) returns null
// if the job belongs to someone else, which prevents a guesser
// from peeking at other hosts' render results.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const h = vi.hoisted(() => ({
  sessionMock: { value: { user: { email: 'host@example.test' } } as unknown },
  getJobMock: vi.fn() as Mock,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => h.sessionMock.value),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/render-jobs', () => ({ getJob: h.getJobMock }));

import { GET } from './route';
import { NextRequest } from 'next/server';

function callGet(jobId: string) {
  return GET(
    new NextRequest(`http://localhost/api/photos/stylize/${jobId}`, { method: 'GET' }),
    { params: Promise.resolve({ jobId }) },
  );
}

describe('GET /api/photos/stylize/[jobId]', () => {
  beforeEach(() => {
    h.sessionMock.value = { user: { email: 'host@example.test' } };
    h.getJobMock.mockReset();
  });

  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await callGet('job-1');
    expect(res.status).toBe(401);
  });

  it('400 when jobId is empty', async () => {
    const res = await callGet('');
    expect(res.status).toBe(400);
  });

  it('404 when getJob returns null (job-not-found OR owner-mismatch)', async () => {
    // The ownership gate lives inside getJob() — passing the
    // session email scopes the lookup, so a successful "another
    // user's job" returns null indistinguishably from a missing
    // jobId. This is the correct security shape: don't leak
    // existence to non-owners.
    h.getJobMock.mockImplementationOnce(async () => null);
    const res = await callGet('someone-elses-job');
    expect(res.status).toBe(404);

    // getJob was called with the SESSION email — without that,
    // anyone with a session could read any job by jobId.
    expect(h.getJobMock).toHaveBeenCalledWith('someone-elses-job', 'host@example.test');
  });

  it('200 with status mapping when job is pending', async () => {
    h.getJobMock.mockImplementationOnce(async () => ({
      id: 'job-1',
      status: 'pending',
      result_url: null,
      result_mime: null,
      status_detail: null,
      created_at: '2026-05-29T00:00:00Z',
      finished_at: null,
    }));
    const res = await callGet('job-1');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      status: 'pending',
      url: null,
      mimeType: null,
      error: null,
    });
  });

  it('200 with url + mimeType when job is complete', async () => {
    h.getJobMock.mockImplementationOnce(async () => ({
      id: 'job-1',
      status: 'complete',
      result_url: 'https://r2.test/stylized/abc.png',
      result_mime: 'image/png',
      status_detail: null,
      created_at: '2026-05-29T00:00:00Z',
      finished_at: '2026-05-29T00:01:30Z',
    }));
    const res = await callGet('job-1');
    const json = await res.json();
    expect(json.status).toBe('complete');
    expect(json.url).toBe('https://r2.test/stylized/abc.png');
    expect(json.mimeType).toBe('image/png');
    expect(json.error).toBeNull();
    expect(json.finishedAt).toBe('2026-05-29T00:01:30Z');
  });

  it('200 surfaces status_detail as error when job failed', async () => {
    h.getJobMock.mockImplementationOnce(async () => ({
      id: 'job-1',
      status: 'failed',
      result_url: null,
      result_mime: null,
      status_detail: 'Gemini quota exceeded',
      created_at: '2026-05-29T00:00:00Z',
      finished_at: '2026-05-29T00:00:45Z',
    }));
    const res = await callGet('job-1');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('failed');
    expect(json.error).toBe('Gemini quota exceeded');
  });

  it('200 only sets error when status is failed (running jobs report null error)', async () => {
    h.getJobMock.mockImplementationOnce(async () => ({
      id: 'job-1',
      status: 'running',
      result_url: null,
      result_mime: null,
      status_detail: 'in progress',  // present but irrelevant
      created_at: '2026-05-29T00:00:00Z',
      finished_at: null,
    }));
    const res = await callGet('job-1');
    const json = await res.json();
    expect(json.status).toBe('running');
    // Critical: status_detail must not leak as `error` unless
    // status === 'failed'. Otherwise the client polling shows
    // "error" while the job is still mid-render.
    expect(json.error).toBeNull();
  });
});
