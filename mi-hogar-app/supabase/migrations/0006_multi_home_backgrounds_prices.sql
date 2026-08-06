-- ============================================================
-- Mi Hogar — múltiples hogares, fondo de la app y precios
-- - profiles.active_home_id (hogar activo del usuario)
-- - profiles.background_url (fondo de pantalla de la app)
-- - shopping_items.price (precio unitario por artículo)
-- - RPCs: get_active_home_id, list_my_homes, set_active_home, leave_home
-- - create_home / join_home / batch_add_products / consume_items
--   ahora usan el hogar activo
-- ============================================================

-- ---------- 1) Cambios de esquema ----------
alter table public.profiles
  add column if not exists active_home_id uuid references public.homes(id) on delete set null,
  add column if not exists background_url text;

alter table public.shopping_items
  add column if not exists price numeric(10,2) check (price >= 0);

-- ---------- 2) Backfill del hogar activo ----------
update public.profiles p
set active_home_id = (
  select m.home_id from public.home_members m
  where m.user_id = p.id
  order by m.joined_at asc
  limit 1
)
where active_home_id is null;

-- ---------- 3) Helper: id del hogar activo ----------
create or replace function public.get_active_home_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select active_home_id from public.profiles where id = auth.uid()),
    (select home_id from public.home_members where user_id = auth.uid() order by joined_at asc limit 1)
  );
$$;

-- ---------- 4) create_home: fija el hogar activo ----------
create or replace function public.create_home(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_home_id uuid;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'El nombre del hogar es obligatorio';
  end if;

  insert into public.homes (name, owner_id)
  values (trim(p_name), auth.uid())
  returning id into v_home_id;

  insert into public.home_members (home_id, user_id, role)
  values (v_home_id, auth.uid(), 'owner');

  update public.profiles set active_home_id = v_home_id where id = auth.uid();

  return v_home_id;
end $$;

-- ---------- 5) join_home: fija el activo si no tenía ----------
create or replace function public.join_home(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_home_id uuid;
begin
  select id into v_home_id from public.homes where invite_code = upper(trim(p_code));
  if v_home_id is null then
    raise exception 'Código de invitación inválido';
  end if;

  insert into public.home_members (home_id, user_id, role)
  values (v_home_id, auth.uid(), 'member')
  on conflict (home_id, user_id) do nothing;

  update public.profiles
  set active_home_id = coalesce(active_home_id, v_home_id)
  where id = auth.uid();

  return v_home_id;
end $$;

-- ---------- 6) Listar mis hogares ----------
create or replace function public.list_my_homes()
returns table (
  id uuid,
  name text,
  invite_code text,
  owner_id uuid,
  role text,
  joined_at timestamptz,
  created_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  return query
    select h.id, h.name, h.invite_code, h.owner_id, m.role, m.joined_at, h.created_at
    from public.home_members m
    join public.homes h on h.id = m.home_id
    where m.user_id = auth.uid()
    order by m.joined_at asc;
end $$;

-- ---------- 7) Cambiar de hogar activo ----------
create or replace function public.set_active_home(p_home_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.home_members where home_id = p_home_id and user_id = auth.uid()) then
    raise exception 'No eres miembro de este hogar';
  end if;
  update public.profiles set active_home_id = p_home_id where id = auth.uid();
end $$;

-- ---------- 8) Salirse de un hogar ----------
create or replace function public.leave_home(p_home_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_homes bigint;
begin
  if not exists (select 1 from public.home_members where home_id = p_home_id and user_id = auth.uid()) then
    raise exception 'No eres miembro de este hogar';
  end if;

  if exists (select 1 from public.homes where id = p_home_id and owner_id = auth.uid()) then
    raise exception 'No puedes salirte de un hogar que creaste';
  end if;

  select count(*) into v_homes from public.home_members where user_id = auth.uid();
  if v_homes <= 1 then
    raise exception 'Debes pertenecer al menos a un hogar';
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

-- ---------- 9) batch_add_products: hogar activo ----------
create or replace function public.batch_add_products(p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_home_id uuid;
  v_count integer := 0;
  v_product_id uuid;
begin
  v_home_id := public.get_active_home_id();
  if v_home_id is null then
    raise exception 'Debes pertenecer a un hogar';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.products (
      home_id, name, quantity, unit, min_quantity, emoji, notes, expiry_date, created_by, updated_by
    ) values (
      v_home_id,
      v_item->>'name',
      coalesce((v_item->>'quantity')::integer, 1),
      coalesce(v_item->>'unit', 'Unidad'),
      coalesce((v_item->>'min_quantity')::integer, 0),
      coalesce(v_item->>'emoji', '🛒'),
      v_item->>'notes',
      (v_item->>'expiry_date')::date,
      auth.uid(),
      auth.uid()
    ) returning id into v_product_id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

-- ---------- 10) consume_items: hogar activo + evento en el hogar del producto ----------
create or replace function public.consume_items(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_home_id uuid;
  v_event_home uuid;
  v_result jsonb := '[]'::jsonb;
  v_new_quantity integer;
  v_name text;
  v_qty integer;
begin
  v_home_id := public.get_active_home_id();
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
    returning p.quantity, p.name, p.home_id into v_new_quantity, v_name, v_event_home;

    if v_new_quantity is null then
      continue;
    end if;

    insert into public.inventory_events (home_id, user_id, action, entity_type, entity_id, details)
    values (v_event_home, auth.uid(), 'consumido', 'producto', (v_item->>'product_id')::uuid,
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
