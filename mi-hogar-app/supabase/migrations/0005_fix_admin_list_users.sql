-- ============================================================
-- Mi Hogar — fix tipo en admin_list_users
-- auth.users.email es varchar(255), el OUT param es text: cast
-- ============================================================

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  status text,
  is_admin boolean,
  avatar_url text,
  profile_color text,
  created_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede consultar usuarios';
  end if;
  return query
    select u.id, u.email::text, p.full_name, p.status, p.is_admin, p.avatar_url, p.profile_color, p.created_at
    from auth.users u
    join public.profiles p on p.id = u.id
    order by p.created_at desc;
end $$;
