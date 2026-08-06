-- ============================================================
-- Mi Hogar — recrear RPC de administración usando is_admin()
-- (la versión inicial desplegada tenía el chequeo inline con
-- "id" sin calificar, ambiguo con los OUT params de la función)
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

create or replace function public.approve_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede aprobar usuarios';
  end if;
  update public.profiles set status = 'approved' where id = p_user_id;
end $$;

create or replace function public.reject_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede rechazar usuarios';
  end if;
  update public.profiles set status = 'rejected' where id = p_user_id;
end $$;

create or replace function public.set_admin(p_user_id uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede asignar administradores';
  end if;
  if p_user_id = auth.uid() and not p_admin then
    raise exception 'No puedes quitarte tu propio rol de administrador';
  end if;
  update public.profiles set is_admin = p_admin where id = p_user_id;
end $$;
