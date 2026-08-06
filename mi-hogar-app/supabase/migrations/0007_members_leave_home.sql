-- ============================================================
-- Mi Hogar — miembros visibles, salir de cualquier hogar
-- - RPC list_home_members (perfil + email de los miembros)
-- - leave_home permite salir incluso del hogar creado
--   (transfiere dueño o borra el hogar si queda vacío)
-- - RLS: miembros del mismo hogar pueden ver el perfil
-- ============================================================

-- ---------- 1) Ver perfiles de los miembros de un hogar ----------
create or replace function public.list_home_members(p_home_id uuid)
returns table (
  home_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  email text,
  full_name text,
  avatar_url text,
  profile_color text
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_home_id) then
    raise exception 'No eres miembro de este hogar';
  end if;
  return query
    select hm.home_id, hm.user_id, hm.role, hm.joined_at,
           u.email::text, p.full_name, p.avatar_url, p.profile_color
    from public.home_members hm
    join auth.users u on u.id = hm.user_id
    left join public.profiles p on p.id = hm.user_id
    where hm.home_id = p_home_id
    order by (hm.role = 'owner') desc, hm.joined_at asc;
end $$;

-- RLS: los miembros de un mismo hogar pueden ver el perfil de los demás
create policy "perfiles: ver co-miembros" on public.profiles
  for select using (
    exists (
      select 1 from public.home_members me
      join public.home_members other on other.home_id = me.home_id
      where me.user_id = auth.uid() and other.user_id = profiles.id
    )
  );

-- ---------- 2) Salirse de un hogar (incluye hogares propios) ----------
create or replace function public.leave_home(p_home_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_members bigint;
  v_other uuid;
begin
  select role into v_role
  from public.home_members
  where home_id = p_home_id and user_id = auth.uid();

  if v_role is null then
    raise exception 'No eres miembro de este hogar';
  end if;

  if v_role = 'owner' then
    select count(*) into v_members from public.home_members where home_id = p_home_id;
    if v_members > 1 then
      -- transferir el hogar al otro miembro más antiguo
      select user_id into v_other
      from public.home_members
      where home_id = p_home_id and user_id <> auth.uid()
      order by joined_at asc
      limit 1;
      update public.home_members set role = 'owner' where home_id = p_home_id and user_id = v_other;
      update public.homes set owner_id = v_other where id = p_home_id;
    else
      -- no queda nadie: eliminar el hogar (cascada sobre productos, listas, eventos)
      delete from public.homes where id = p_home_id;
      update public.profiles
      set active_home_id = (
        select home_id from public.home_members
        where user_id = auth.uid()
        order by joined_at asc
        limit 1
      )
      where id = auth.uid();
      return;
    end if;
  end if;

  delete from public.home_members where home_id = p_home_id and user_id = auth.uid();

  if (select active_home_id from public.profiles where id = auth.uid()) = p_home_id then
    update public.profiles
    set active_home_id = (
      select home_id from public.home_members
      where user_id = auth.uid()
      order by joined_at asc
      limit 1
    )
    where id = auth.uid();
  end if;
end $$;
