-- Grounding documents, and the fact that some extracted text is a fragment.
--
-- Applied to the remote project on 2026-08-13; recorded here so the schema is
-- reproducible from the repository.

-- A document the assistant reads but nobody browses: it grounds answers and is
-- absent from every library listing and from the download route. Distinct from
-- access_level, which says who may READ a document that is on the shelf; this
-- says the document is not on the shelf at all.
alter table documents
  add column if not exists assistant_only boolean not null default false;

comment on column documents.assistant_only is
  'True: grounding source only. Hidden from every library listing and undownloadable; still read by the assistant for residents and staff.';

-- Every listing filters on this, so keep the common case (false) cheap.
create index if not exists documents_assistant_only_idx
  on documents (assistant_only) where assistant_only = false;

-- Some extracted_text is a fragment: an earlier OCR pass capped stored text at
-- 150,000 characters, so long recorded instruments stop mid-sentence. That is
-- fine for search and actively harmful as grounding — a model reading a severed
-- declaration reports that it is silent on whatever fell off the end. The text
-- is kept (still useful for matching); this says not to answer from it as
-- though it were the whole document.
alter table documents
  add column if not exists text_is_partial boolean not null default false;

comment on column documents.text_is_partial is
  'True: extracted_text is a fragment of the document, not the whole of it. Usable for search; never quote it as complete.';

-- The one document cut at exactly the old cap. Compared against its clean
-- re-extraction: it ends mid-sentence two-thirds through the declaration.
update documents
   set text_is_partial = true
 where extracted_text is not null
   and length(extracted_text) = 150000;
