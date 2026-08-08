-- Master inventory fields: the selling builder and the platted lot size
-- (front footage from the county sheet). sq_ft (house size from the ARC
-- sheet) stays for enrichment.

alter table public.lots
  add column if not exists builder text,
  add column if not exists lot_size numeric(6, 2);
