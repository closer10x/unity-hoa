-- First and last name, kept apart.
--
-- The form asks for them in two boxes, so store them in two columns: a name
-- split back out of "Jon Garcia Alvarez" is a guess, and the guess is wrong
-- for exactly the people who notice. `name` stays as the composed full name
-- because that is what the roster, the invoices and every notice display.

alter table public.resident_signups
  add column if not exists first_name text,
  add column if not exists last_name text;
