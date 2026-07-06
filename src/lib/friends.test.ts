// ─────────────────────────────────────────────────────────────
// Pearloom / lib/friends.test.ts
//
// decideRequest is the pure heart of the friend handshake (the
// subtle part): given the two possible existing rows for a
// (from → to) request, what should requestFriend do? Pins the
// consent semantics — no self-friend, mutual pending collapses to
// accepted, idempotent re-requests, re-opening a declined ask.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { decideRequest } from './friends';

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('decideRequest', () => {
  it('refuses missing ids', () => {
    expect(decideRequest({ fromPersonId: '', toPersonId: B, reverse: null, forward: null }))
      .toEqual({ kind: 'invalid', reason: 'missing' });
  });

  it('refuses self-friendship', () => {
    expect(decideRequest({ fromPersonId: A, toPersonId: A, reverse: null, forward: null }))
      .toEqual({ kind: 'invalid', reason: 'self' });
  });

  it('inserts a fresh pending request when no rows exist', () => {
    expect(decideRequest({ fromPersonId: A, toPersonId: B, reverse: null, forward: null }))
      .toEqual({ kind: 'insert' });
  });

  it('accepts a reverse pending — mutual desire collapses to accepted', () => {
    expect(decideRequest({
      fromPersonId: A, toPersonId: B,
      reverse: { id: 'r1', status: 'pending' }, forward: null,
    })).toEqual({ kind: 'accept-reverse', rowId: 'r1' });
  });

  it('is a no-op when already accepted the reverse way', () => {
    expect(decideRequest({
      fromPersonId: A, toPersonId: B,
      reverse: { id: 'r1', status: 'accepted' }, forward: null,
    })).toEqual({ kind: 'noop', status: 'accepted' });
  });

  it('is idempotent for our own already-pending request', () => {
    expect(decideRequest({
      fromPersonId: A, toPersonId: B,
      reverse: null, forward: { id: 'f1', status: 'pending' },
    })).toEqual({ kind: 'noop', status: 'pending' });
  });

  it('is a no-op when already accepted our way', () => {
    expect(decideRequest({
      fromPersonId: A, toPersonId: B,
      reverse: null, forward: { id: 'f1', status: 'accepted' },
    })).toEqual({ kind: 'noop', status: 'accepted' });
  });

  it('re-opens our own previously declined request', () => {
    expect(decideRequest({
      fromPersonId: A, toPersonId: B,
      reverse: null, forward: { id: 'f1', status: 'declined' },
    })).toEqual({ kind: 'reopen', rowId: 'f1' });
  });

  it('lets a new forward request through after we once declined them', () => {
    // reverse (they asked) was declined by us; now WE want to ask.
    expect(decideRequest({
      fromPersonId: A, toPersonId: B,
      reverse: { id: 'r1', status: 'declined' }, forward: null,
    })).toEqual({ kind: 'insert' });
  });

  it('re-opens our declined forward even when their reverse was declined too', () => {
    expect(decideRequest({
      fromPersonId: A, toPersonId: B,
      reverse: { id: 'r1', status: 'declined' }, forward: { id: 'f1', status: 'declined' },
    })).toEqual({ kind: 'reopen', rowId: 'f1' });
  });
});
