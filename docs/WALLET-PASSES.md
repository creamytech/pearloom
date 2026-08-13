# Wallet passes — what's built, and the one thing that isn't

> Built 2026-08-05. **Google Wallet is complete.** Apple Wallet is
> complete except the signature, which needs a certificate only the
> account owner can obtain.

---

## 1 · What a guest gets

A pass in their phone carrying the date, the time, the venue and
what to wear, with a QR code that opens their own passport page.
It survives a car park with no signal and surfaces itself on a
lock screen at the right moment — the two things a web page can't
do.

The card appears on `/g/[token]` under the RSVP. **It renders
nothing unless a platform is actually configured**: a dead "Add to
Apple Wallet" button teaches a guest the product is broken, and
they'd be right.

Two rules are enforced in code and pinned by tests:

- **A pass is not a roster.** It carries the bearer's own details
  and the event's public logistics. Never another guest, never
  money, never the host's account email — the same contract as the
  vendor packet and the printable briefcase.
- **A memorial is not a ticket.** Wallet formats were built for
  concerts; their vocabulary (*admits*, *ticket*, *doors*) would be
  grotesque on a funeral. Solemn occasions get their own register:
  "Service", "This pass belongs to", and no dress-code prompt. The
  platform's internal style name stays `eventTicket` because that's
  structural — the words a mourner reads never do.

## 2 · Google Wallet — done, just add a key

Google's save link is a JWT signed RS256, and Node signs RS256
natively, so there was no ceremony and no dependency to add.

```
GOOGLE_WALLET_ISSUER_EMAIL   service account, e.g. pass@pearloom.iam.gserviceaccount.com
GOOGLE_WALLET_ISSUER_ID      numeric issuer id from the Google Pay & Wallet Console
GOOGLE_WALLET_PRIVATE_KEY    the service account's PEM key (literal \n is accepted)
GOOGLE_WALLET_CLASS_ID       optional; defaults to <issuerId>.pearloom_celebration
```

Set those three and the button appears. With no key, `googleSaveUrl`
returns `null` and the button never renders. A malformed key also
returns `null` rather than throwing at a guest.

## 3 · Apple Wallet — everything but the signature

A `.pkpass` is `pass.json` + images + a `manifest.json` of SHA-1
digests + a **detached PKCS#7 signature** over that manifest, zipped.
All of it is built and tested here:

- `zip.ts` — a deterministic store-only ZIP writer (no dependency
  existed). Verified against the system `unzip`, including its own
  integrity check, because an encoder agreeing with my own reader
  would prove nothing.
- `icon.ts` — Apple requires a square `icon.png`; the repo had none
  (logo.png is 1824×2021 and 455KB). This draws one: the cream
  pearl on olive ground, tinted per site to the celebration's own
  accent. A real PNG encoder over Node's zlib, decoded
  independently in tests.
- `pass-content.ts` / `pkpass.ts` — the pass body and archive.

**What's missing:** `APPLE_PASS_CERT`, `APPLE_PASS_KEY`,
`APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`. The certificate comes from
an Apple Developer account (Certificates → Pass Type IDs).

When it arrives, implement `PassSigner`:

```ts
interface PassSigner { sign(manifest: Buffer): Promise<Buffer> }  // detached PKCS#7, DER
```

`openssl smime -sign -binary -outform DER -noattr` does it, as does
node-forge. Pass it to `buildPkPass({ ..., signer })` — **nothing
else changes.**

### Why it refuses instead of degrading

With no signer, `buildPkPass` throws `PassNotConfiguredError` and
the route returns 503. It never emits an unsigned archive, because
an unsigned `.pkpass` is not a degraded pass: it's a file iOS
rejects with a meaningless error, in front of a guest who will
blame the invitation. Same posture Phase 0 forced on the film
webhook.

## 4 · The route

`GET /api/wallet/[token]` — **Guest-token** class (ROUTE-AUDIT §1).
The passport token is the whole authorization; it identifies one
person on one celebration and the route reads no further. Drafts
404 (issuing a pass would leak an unshared site), and a bad token
gets the same shape as a missing one, so it learns nothing.

| Query | Returns |
|---|---|
| *(none)* | `{ apple, google }` availability, so a surface offers only what works |
| `?platform=google` | `{ saveUrl }`, or 503 |
| `?platform=apple` | the `.pkpass` binary, or 503 |

Rate-limited 30/min/IP. Serial number is the guest's token, so
re-issuing **updates** their existing pass rather than leaving two
in the wallet.
