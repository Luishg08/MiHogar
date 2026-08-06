-- ============================================================
-- Mi Hogar — corrección RLS de administradores
-- La política original consultaba profiles desde su propia política
-- y causaba "infinite recursion detected". Se usa el helper is_admin().
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;

drop policy if exists "perfiles: admin ve todos" on public.profiles;
drop policy if exists "perfiles: admin actualiza todos" on public.profiles;

create policy "perfiles: admin ve todos" on public.profiles
  for select using (public.is_admin());

create policy "perfiles: admin actualiza todos" on public.profiles
  for update using (public.is_admin()) with check (true);
