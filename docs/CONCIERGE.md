# The Concierge Number — how to turn it on

> Built 2026-08-04/05. The code is done and tested. What's left is
> buying numbers and pointing them at the webhook.

---

## 1 · What it is

A guest texts a question — *what time?*, *what do I wear?*, *where
do I park?* — and Pear answers from the celebration they were
actually invited to. If the answer isn't on the site, the question
goes to the host's notification bell and the guest is told so.

All three platform reviews landed on this channel independently:
the guest who will never open a website will answer a text.

**It works on SMS and WhatsApp**, on the same webhook.

## 2 · Turning it on

1. Buy a number in Twilio (or enable a WhatsApp sender on the same
   account).
2. Set its **A MESSAGE COMES IN** webhook to
   `POST https://<your-domain>/api/sms/inbound`.
3. Make sure `TWILIO_AUTH_TOKEN` is set. **Without it every request
   is rejected** — the signature check fails closed on purpose.
4. Optional, for WhatsApp replies from a specific sender:
   `TWILIO_WHATSAPP_FROM`.

That's it. Twilio routes the reply back on whichever channel the
message arrived on, so nothing else needs configuring.

### WhatsApp needs no template approval for this

Worth stating plainly, because it's the difference between "blocked"
and "works today": WhatsApp requires pre-approved templates only to
**open** a conversation. Inside the 24-hour window a guest's own
message opens, free-form replies are allowed. The concierge is
reactive by construction — it only ever answers — so it operates
fully on WhatsApp before any template exists. Template approval
gates outbound campaigns (invitations, nudges), not this.

## 3 · Shared number, or one per celebration

Both are supported; the difference is only whether
`sites.concierge_number` is set.

| | Shared | Dedicated |
|---|---|---|
| Cost | one number, total | ~$1/month each |
| Scales to | thousands | a premium tier |
| Guest on two lists | gets asked which one | never asked — the number names the event |

To dedicate a number, store it **digits only** on the site:

```sql
update public.sites set concierge_number = '15551230000' where subdomain = 'emma-james';
```

The column refuses anything that isn't 7–15 digits, and a unique
index guarantees one number never names two celebrations — a
collision there would deliver one host's guests to another host's
site. Both guards were exercised against the live table when the
migration was applied.

**A dedicated number narrows; it never widens.** Texting Emma &
James's number does not entitle anyone to anything about Emma &
James — the sender must still be on that guest list. A guest who
texts it but is only on a *different* celebration's list is told
nothing, and is deliberately **not** answered about the other one.
A phone number is far more guessable than a passport token, so if
this ever answered, buying a number would turn it into a probe
against a guest list.

## 4 · What it refuses to do

- **Trust an unsigned request.** `verifyTwilioSignature` fails
  closed, including when the auth token is unset.
- **Tell an unrecognised number anything.** No names, no dates, not
  even whether the number is on a list — the reply is symmetric, so
  it leaks nothing either way.
- **Improvise.** The model gets an allowlist of public logistics
  (`lib/sms/site-facts`) — never money, other guests, vendors or
  private host notes — and is told to emit `NO_ANSWER` rather than
  guess. A guest driving to a wrong address because a model invented
  one is the worst thing this feature could do.
- **Answer about a draft.** Unpublished celebrations resolve to
  nothing.

STOP and HELP are handled as carrier keywords and never reach the
model or the host — but "help me find parking" is a question, not a
compliance word, and is treated as one.

## 5 · Where the code lives

| Piece | File |
|---|---|
| Webhook | `src/app/api/sms/inbound/route.ts` |
| Signature check (fails closed) | `src/lib/sms/verify-twilio.ts` |
| Decision rules (pure) | `src/lib/sms/concierge.ts` |
| SMS ↔ WhatsApp addressing | `src/lib/sms/channel.ts` |
| Dedicated-number routing | `src/lib/sms/number-routing.ts` |
| What the model may know | `src/lib/sms/site-facts.ts` |

Everything except the route is pure and unit-tested; the route is
plumbing around it.
