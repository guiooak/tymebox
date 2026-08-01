# Timebox Works — Report Delivery Scoping (email + shareable link)

## Context

The next-version feature brainstorm
(`2026-07-31-01-next-version-feature-enhancements.md`) asked for four report
outcomes. Three are now built on the feature branch:

- **Copy report** — already existed (`TemplatePreviewModal`).
- **Download chart as PNG** — reuses `svgElementToPngDataUrl`.
- **Print / PDF** — `window.print()` behind a print stylesheet in
  `src/styles/base.css`.

The remaining two — **email send** and **shareable link** — are the only items
in that brainstorm that cannot be delivered client-side. Both need
infrastructure the app doesn't have yet, so this document scopes them instead
of half-building them. Everything below is a proposal to react to, not
something to start.

---

## A. Email send

### What the user needs to supply

| Field | Default | Notes |
|---|---|---|
| Recipients | empty | Comma/enter-separated; validate shape only, not deliverability |
| Subject | `Timebox report — {event name}` | Editable |
| Body | rendered report | Reuse the exact render behind `TemplatePreviewModal` |
| Include chart | on | The PNG we already rasterize, inlined as a `cid:` attachment |
| Copy me | on | Sends to the signed-in user's own address |

Recipients are the only new *stored* data if we keep a "recent recipients" list;
scoping that out for v1 keeps this feature stateless.

### Body rendering

`TemplatePreviewModal` currently produces two things: a plain-text transcript
(`buildReportText`) and a DOM preview. For email:

- **Text part** — `buildReportText` as-is. It already carries goals, notes,
  timings and the parking-lot topics (now including the milestone each topic
  was parked during).
- **HTML part** — needs a *new* renderer. The preview's DOM depends on CSS
  modules and custom properties, neither of which survives an email client.
  Expect a small, separate table-based HTML template rather than a reuse of
  the on-screen markup. Budget this as the bulk of the work.

Recommendation: extract `buildReportText` into
`features/meeting/report/reportTemplate.ts` alongside a new `buildReportHtml`,
so the modal, the clipboard and the email body all read from one place.

### Delivery mechanism

Three options, in increasing order of cost:

1. **`mailto:` link (client-only).** Zero infrastructure, works today, but
   `mailto:` cannot carry an attachment, silently truncates on long bodies in
   several clients, and hands the user an unsent draft. Acceptable as a
   stopgap; not what the requirement describes.
2. **Cloud Function + transactional provider (recommended).** An HTTPS callable
   that takes `{ meetingId, recipients, subject, includeChart }`, re-reads the
   meeting server-side (never trusting a client-supplied body), renders both
   parts and hands off to a provider. Auth comes free from the callable
   context.
3. **Provider-side templates.** Moves the HTML into the provider's dashboard.
   Cheaper to iterate on copy, worse for review and versioning. Not
   recommended for a repo that keeps its templates in-tree.

### Security and abuse notes

- The function must **re-read the meeting from the database** using the caller's
  uid and confirm ownership. Rendering a client-supplied body would turn the
  app into an open relay.
- Rate-limit per uid (a small counter node, or the provider's own limits).
- Cap recipients per send (10 is generous for a meeting report).
- The chart PNG is generated in the browser today; server-side rendering it
  means either shipping a headless browser or accepting a client-uploaded image
  (which needs size/type validation). Simplest v1: **omit the chart** from the
  email and link back to the report instead — which folds into part B.

### Rough shape of the work

- Firebase Functions project setup (the repo has none today) — the largest
  single cost, and it also unlocks the fan-out work in plan 3.
- `buildReportHtml` + template tests.
- A send modal reusing the existing preview, plus optimistic/failed states.
- Provider account, domain verification, SPF/DKIM. Non-trivial calendar time
  even though it is little code.

---

## B. Shareable link

A read-only report URL is the lighter-weight alternative to email — and, per
the note above, probably the *prerequisite* that makes email simple (send a
link, not a rendered report).

**This is already specified.** `2026-06-08-03-collaborative-sharing-and-deep-links.md`
covers exactly this: deep-link routes (`/meetings/:id/report`), moving meetings
out of the per-user silo into a top-level collection with an explicit membership
ACL, and the security-rule rewrite that follows. A shareable report is the
narrowest slice of that plan:

- Section A (deep-link routing) in full — it is the prerequisite.
- Section B, but only `visibility: 'private' | 'public'` with
  `defaultRole: 'viewer'`. No members map, no email→uid directory, no
  invitations.
- Section C's rules for that reduced model, including the decision about
  whether a public report is readable **unauthenticated** (it should be, or the
  link is useless to anyone outside the app).

**Do not build a parallel sharing mechanism here.** Anything bolted onto the
current `users/$uid/meetings` layout would have to be unpicked when plan 3
lands.

Two decisions worth taking early:

1. **Link revocation** — flipping visibility back to private must invalidate the
   link. That falls out of reading visibility at load time; just don't cache it.
2. **Unlisted vs public** — an unguessable id is not a secret if it ends up in
   a chat log. If reports may contain sensitive notes, a separate random share
   token (rotatable independently of the meeting id) is worth the extra field.

---

## Suggested sequencing

1. **Plan 3, section A + reduced B/C** → shareable read-only report links.
   Delivers the requirement's spirit with no mail infrastructure.
2. **Functions project** (needed by plan 3's fan-out anyway).
3. **Email send**, shipping a link-first email; add the full rendered body and
   inline chart only if users ask for it.

The interim `mailto:` option stays available if a stopgap is wanted before step
1, with the caveats above stated in the UI rather than hidden.
