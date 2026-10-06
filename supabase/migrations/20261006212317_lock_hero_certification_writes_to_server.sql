revoke update on public.hero_certifications from authenticated;
drop policy if exists "heroes can update own readiness" on public.hero_certifications;
