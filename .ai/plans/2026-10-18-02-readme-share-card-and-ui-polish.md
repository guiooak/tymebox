# Tymebox — README, share card and small UI requests

## Context

A run of small requests from the owner between 2026-10-18 and 2026-10-19,
each done and pushed on its own. No written plan: this records what was
asked and what changed.

## README (`7d954d9`)

- **Asked:** "make it inviting to use the app".
- **Done:** the README opens with what Tymebox is and a link to it, with
  screenshots of the landing and of the board on desktop and phone (in
  `docs/screenshots/`). The developer sections follow.

## Link previews (`4812eb6`)

- **Asked:** a link sent on WhatsApp looked bare.
- **Done:** a 1200×630 card per language, `public/og-en.png` and
  `public/og-pt.png`. They are drawn by `scripts/share-card.mjs`, so they can
  be regenerated, and the `og:`/`twitter:` tags point to them.

## Footers

- **Landing footer (`664a370`):** the logo in the middle.
- **App footer (`0e43872`):** a small logo in place of the "·" in "Tymebox ·
  focus only on what matters", with a closing period.
- **Landing and report e-mail footers (`fc5af90`):** a closing period.
- **Later change (2026-10-23):** the landing went back to a "·", with the
  legal links beside it. See `2026-10-17-03-landing-page.md`.

## Event form and milestones (`9c9129c`)

- **New event form:** no placeholders.
- **Milestone notes:** the "Notes" label became the textarea's placeholder.

## Home (2026-10-19)

- **`1837478`, `7cf9bd0`:** "Back to the live event" and "See all" use the
  tertiary button.
- **`947c8e7`:** each metric is tinted by its result. Time vs budget and
  milestones completed go green, amber or red by how they read, this month
  takes the primary blue, and the streak the amber of its flame.
- **`68329ec`:** the weekly summary under the greeting was dropped. It
  repeated what the metric cards already show.

## Shell

- **`a0ee501`:** the theme switch is hidden when the sidebar is collapsed,
  like the language selector.
