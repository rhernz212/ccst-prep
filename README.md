# Cert Prep

A study/practice-exam site for IT certifications, currently covering Cisco's CCST Networking exam. Landing page → pick a certification → five tabs: Study Material, Practice Quizzes, Subnetting, CLI Practice, and a Full Practice Exam.

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

`scripts/ingest/ingest-ccst-networking.ts` parses the source EPUB (extracted XHTML) into `content/exams/ccst-networking/`: per-chapter JSON, a question bank (`questions.json`), and the exam blueprint (`blueprint.json`). It also copies referenced images into `public/content/ccst-networking/images/`.

```bash
npm run ingest:ccst -- --source "<path to extracted epub OPS folder>"
```

Then re-run `npm run seed:db` to push the updated content into Supabase (idempotent — safe to re-run).

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
- `scripts/ingest/` — the EPUB→JSON parsing pipeline and the DB seeding script.
- `supabase/migrations/` — schema, in order.
