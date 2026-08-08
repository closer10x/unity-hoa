-- Assistant grounding: cache the extracted text of library documents so the
-- floating Q&A can quote CC&Rs, rules and guidelines instead of guessing.
-- Filled lazily the first time the assistant needs a document; cleared by
-- re-upload (new row) since documents rows are immutable per version.
alter table public.documents
  add column if not exists extracted_text text,
  add column if not exists extracted_at timestamptz;
