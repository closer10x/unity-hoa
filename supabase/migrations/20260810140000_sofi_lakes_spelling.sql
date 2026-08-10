-- The association is "Sofi Lakes Residential Association Inc." — two words,
-- matching how the community is written everywhere else in the portal and on
-- the deed. The seed had it as one.
--
-- A separate migration rather than an edit to the seed alone: the seed only
-- runs on a database that has never had these rows, so a project that already
-- applied it would keep the wrong name forever.

update public.billing_entities
set name = 'Sofi Lakes', legal_name = 'Sofi Lakes Residential Association Inc.'
where key = 'sofilakes';
