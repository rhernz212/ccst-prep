-- Full-text search over chapter content.
--
-- `sections.html` has been seeded since the first migration with a comment
-- saying it was "for future admin/search use" — this is that use. Searching
-- it needs two things the raw column can't give: the text without its markup,
-- and a tsvector to index.
--
-- Both are generated columns rather than a re-seed, so this migration makes
-- existing content searchable the moment it runs — no re-ingest, no backfill
-- script, and no way for the index to drift out of step with the html it
-- describes.

-- Markup and HTML entities out, so neither "div" nor "nbsp" is a search term
-- and so a snippet reads as prose. Immutable and strict-ish by construction,
-- which is what lets a generated column call it.
create or replace function content_plain_text(source text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(
           regexp_replace(coalesce(source, ''), '<[^>]*>', ' ', 'g'),
           '&[a-zA-Z#0-9]{1,8};', ' ', 'g'
         );
$$;

alter table sections
  add column search_text text generated always as (content_plain_text(html)) stored,
  -- Title weighted above body: a section *called* "Subnetting Basics" is a
  -- better answer for "subnetting" than one that mentions it in passing.
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', content_plain_text(html)), 'B')
  ) stored;

create index sections_search_idx on sections using gin (search_vector);

-- Ranking and snippets can't be expressed through PostgREST's query syntax,
-- so the whole search is one function the API route calls.
--
-- Highlights are delimited with [[HL]]…[[/HL]] rather than <mark> on purpose:
-- the client splits on those markers and renders real elements, so nothing
-- from the book's text is ever interpreted as markup on the way back out.
create or replace function search_sections(
  exam_slug text,
  search_query text,
  max_results int default 12
)
returns table (
  chapter_number int,
  chapter_slug text,
  chapter_title text,
  section_title text,
  anchor_id text,
  snippet text,
  rank real
)
language sql
stable
parallel safe
as $$
  with q as (select websearch_to_tsquery('english', search_query) as ts)
  select
    c.number,
    c.slug,
    c.title,
    s.title,
    s.anchor_id,
    ts_headline(
      'english',
      s.search_text,
      q.ts,
      'StartSel=[[HL]],StopSel=[[/HL]],MaxWords=30,MinWords=12,ShortWord=3,MaxFragments=1'
    ),
    ts_rank(s.search_vector, q.ts)
  from sections s
  join chapters c on c.id = s.chapter_id
  join exams e on e.id = c.exam_id
  cross join q
  where e.slug = exam_slug
    and s.search_vector @@ q.ts
  -- Reading order breaks ties, so two equally-ranked hits come back in the
  -- order you'd meet them in the book.
  order by ts_rank(s.search_vector, q.ts) desc, c.order_index, s.order_index
  limit least(greatest(max_results, 1), 50);
$$;

grant execute on function content_plain_text(text) to anon, authenticated, service_role;
grant execute on function search_sections(text, text, int) to anon, authenticated, service_role;
