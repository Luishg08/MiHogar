-- ============================================================
-- Mi Hogar — roles administrador + consumo por nota de voz (IA)
-- ============================================================

-- ---------- Perfiles: rol admin y estado de aprobación ----------
alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

-- Los usuarios existentes (anteriores a esta función) quedan aprobados.
update public.profiles set status = 'approved' where status = 'pending';

-- Bootstrap: el dueño de cada hogar existente es administrador aprobado.
update public.profiles set is_admin = true, status = 'approved'
  where id in (select owner_id from public.homes);

-- ---------- RLS: administradores ven y gestionan todos los perfiles ----------
-- Helper security definer (evita recursión infinita al consultar profiles desde su propia política).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;

create policy "perfiles: admin ve todos" on public.profiles
  for select using (public.is_admin());

create policy "perfiles: admin actualiza todos" on public.profiles
  for update using (public.is_admin()) with check (true);

-- ---------- RPC: gestión de usuarios (solo admin) ----------
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

-- ---------- RPC: descontar del inventario (nota de voz / IA) ----------
create or replace function public.consume_items(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_home_id uuid;
  v_result jsonb := '[]'::jsonb;
  v_new_quantity integer;
  v_name text;
  v_qty integer;
begin
  select home_id into v_home_id from public.home_members where user_id = auth.uid() limit 1;
  if v_home_id is null then
    raise exception 'Debes pertenecer a un hogar';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::integer, 1));

    update public.products p
    set quantity = greatest(0, p.quantity - v_qty),
        updated_by = auth.uid()
    from public.home_members hm
    where p.id = (v_item->>'product_id')::uuid
      and hm.user_id = auth.uid()
      and hm.home_id = p.home_id
    returning p.quantity, p.name into v_new_quantity, v_name;

    if v_new_quantity is null then
      continue;
    end if;

    insert into public.inventory_events (home_id, user_id, action, entity_type, entity_id, details)
    values (v_home_id, auth.uid(), 'consumido', 'producto', (v_item->>'product_id')::uuid,
            jsonb_build_object('name', v_name, 'quantity', v_qty));

    v_result := v_result || jsonb_build_object(
      'product_id', (v_item->>'product_id')::uuid,
      'name', v_name,
      'quantity', v_qty,
      'new_quantity', v_new_quantity
    );
  end loop;

  return v_result;
end $$;
