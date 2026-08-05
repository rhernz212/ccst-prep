# Cert Prep

A study/practice-exam site for IT certifications, currently covering Cisco's CCST Networking exam. Landing page → pick a certification → tabs for Study Material, Practice Quizzes, Review, Notes, Subnetting, CLI Practice, and a Full Practice Exam.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, with Supabase for auth and Postgres.

## First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then copy `.env.local.example` to `.env.local` and fill in the three values from Project Settings → API.

3. **Apply the database schema.** Run every file in `supabase/migrations/` in order via the Supabase SQL Editor (or `supabase db push` if you're linked to the project via the CLI).

4. **Seed content.** The book content for CCST Networking is already ingested into `content/exams/ccst-networking/` and committed to the repo — you don't need to re-run ingestion unless the source book changes. Seed the structural data (chapters, sections, blueprint, questions) into Supabase:

   ```bash
   npm run seed:db
   ```

5. **Run the dev server**

   ```bash
   npm run dev
   ```

## Content ingestion (only needed if the source book changes)

`scripts/ingest/ingest.ts` parses a source EPUB (extracted XHTML) into `content/exams/<slug>/`: per-chapter JSON, a question bank (`questions.json`), and the exam blueprint (`blueprint.json`). It also copies referenced images into `public/content/<slug>/images/`.

```bash
npm run ingest:ccst
```

Pass `--source=<path>` to override the book location, or `--only=<n>` to re-parse a single chapter (which skips rewriting the combined `questions.json`/`blueprint.json`).

```bash
npm run ingest -- --exam=ccst-networking --source="<path to extracted epub OPS folder>"
```

### Adding another certification

The app itself is already multi-exam — `listExams()` picks up any directory under `content/exams/`, `npm run seed:db` loops over all of them, and the routes are keyed by exam slug. The book-specific part is ingestion.

Publishers structure their EPUBs differently enough that no single parser handles them all, so the markup-shaped half lives behind a `BookAdapter` (`scripts/ingest/adapters/types.ts`). `ingest.ts` owns what's publisher-agnostic: walking chapters in navigation order, writing chapter JSON, pairing review questions to answers by ordinal, and deriving each chapter's blueprint domain.

To add a certification:

1. Implement a `BookAdapter` under `scripts/ingest/adapters/<publisher>/`. If the book is from a series that's already supported, you may only need a new config entry — `createSybexAdapter` takes the file names and objectives anchor as parameters.
2. Register it against the exam slug in `scripts/ingest/adapters/registry.ts`.
3. Hand-write `content/exams/<slug>/meta.json` (slug, title, vendor, exam code, time limit, question count, target score).
4. Run `npm run ingest -- --exam=<slug>` then `npm run seed:db`.

### Optional tool tabs

Study, Practice Quizzes, Review, Notes, and Full Practice Exam are driven by ingested content (or by the reader's own data), so every exam gets them — though Notes is hidden entirely from signed-out visitors, since there's nowhere to store what they'd write. Subnetting and CLI Practice are standalone simulators that only suit exams testing those skills, so they're opt-in per exam via `tools` in `meta.json`:

```json
"tools": ["subnetting"]
```

Omitting the field entirely means all tools, so existing exams keep working. A tool that isn't listed is hidden from both tab bars *and* 404s at its route — `lib/content/exam-tools.ts` is the single source of truth, read by the layout and by each tool's page.

Then re-run `npm run seed:db` to push the updated content into Supabase (idempotent — safe to re-run).

Images are re-encoded to WebP (max 1400px wide) during ingestion, and each `<img>` is emitted with intrinsic `width`/`height` plus `loading="lazy"`. The source PNGs are several megabytes apiece; one chapter page was shipping 133 MB of them before this.

## Re-optimizing already-ingested images

`npm run optimize:images` applies that same conversion to content that's already in `content/` without needing the source epub — it converts anything still in PNG form, rewrites the committed JSON to match, and removes the superseded originals. It's idempotent, so re-running is a no-op once everything is WebP.

```bash
npm run optimize:images
```

Pass `--source "<path to extracted epub OPS folder>"` if the content references an image that was never copied into `public/`.

## Search

Every chapter is full-text searchable from the ⌘K / Ctrl-K palette in the exam header (`/` works too), and a hit links straight to the section's anchor rather than the top of the chapter.

The index is two generated columns on `sections` — plain text with the markup stripped, and a weighted `tsvector` with the section title ranked above its body — so existing content becomes searchable the moment the migration runs, with no re-ingest and no way for the index to drift from the HTML it describes. Ranking and snippet extraction can't be expressed through PostgREST, so both live in a `search_sections` SQL function that `app/api/search/route.ts` wraps.

Snippet highlights come back delimited with `[[HL]]…[[/HL]]` rather than `<mark>`: the excerpt is book prose that has already had its markup stripped, and the client splits on those markers to render real elements instead of re-parsing content as HTML at the last step.

## The review log

`question_review_state` holds only where a card is *now*. `review_events` (added in `20260805090000_review_events.sql`) appends what actually happened on every answer — source, correctness, days since the last sighting, and the scheduler state either side of it.

Nothing reads it yet. It exists because a fitted scheduler like FSRS is trained on review histories, and none of that can be reconstructed from a current interval — so every day without the log is data that can't be recovered later. It's written from `recordReviewResults`, the one place that knows both the state before an answer and the state after.

## Owner-only extras

Two features exist only for the account named by `OWNER_EMAIL` (see `lib/owner.ts`, which defaults to the site owner's address):

- **The study garden** at `/garden` — one plant for every day you've studied, grown entirely from the timestamps the app already writes. What a day grows depends on what you did with it: ferns for reading, daisies for quizzes, tulips for reviews, sunflowers for practice exams, a rose for ten-plus things in one day, and a moonflower for anything studied after 11pm or before 5am. How much you did that day sets how far it opens, and plants inside a run of seven days or more are lit. Nothing is stored, so there's no migration and no new write on the reading path — `lib/domain/garden/garden.ts` is pure and unit-tested, `lib/garden/get-garden.ts` feeds it.
- **Lantern mode** in the chapter reader — a warm, low-glare tint for late-night sessions, with an auto setting that switches itself on after 9pm. It's a third palette rather than a third theme (`:root[data-reader-tint="sepia"]` in `app/globals.css`), so it composes with light *and* dark mode instead of overriding either, and it's applied before first paint by the root layout's inline script.

Everything gated this way degrades to the feature simply not being there — `/garden` 404s and the reader control isn't rendered.

## Tests

Pure domain logic (subnetting calculator, CLI command simulator, exam question selection/scoring) has unit tests:

```bash
npm test
```

## Project layout

- `app/` — routes. `app/exams/[examSlug]/` holds the five tabs, generalized by exam slug rather than hardcoded to one certification.
- `lib/domain/` — framework-agnostic, unit-tested logic (subnetting, CLI simulator, exam selection/scoring) with no React/Next/Supabase imports.
- `lib/content/` — reads ingested content JSON. `content-reader.ts` has no bundler-specific guards (usable from plain Node scripts); `exam-content.ts` re-exports it behind a `server-only` guard for use in the app.
- `lib/supabase/` — client/server/admin Supabase client factories and the session-refresh helper used by `proxy.ts`.
- `scripts/ingest/` — the EPUB→JSON parsing pipeline and the DB seeding script. `ingest.ts` is publisher-agnostic; per-publisher markup parsing lives in `adapters/`.
- `supabase/migrations/` — schema, in order.
