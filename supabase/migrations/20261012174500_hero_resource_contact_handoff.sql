-- Feature 12: user-approved contact handoff for accepted practical requests.
-- Contact details remain encrypted at rest and are never part of coarse/public map data.

alter table public.hero_requests
  add column if not exists contact_ciphertext text;

alter table public.hero_requests
  drop constraint if exists hero_requests_contact_ciphertext_length_check;
alter table public.hero_requests
  add constraint hero_requests_contact_ciphertext_length_check
  check (contact_ciphertext is null or char_length(contact_ciphertext) <= 1024);
