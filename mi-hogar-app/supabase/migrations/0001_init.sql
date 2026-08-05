-- ============================================================
-- Mi Hogar — esquema inicial
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Perfiles de usuario ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  avatar_url text,
  profile_color text not null default '#0f766e',
  theme jsonb not null default '{"mode":"light","primary":"#0f766e","accent":"#f59e0b"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Hogar (vivienda) ----------
create table public.homes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  owner_id uuid not null references auth.users,
  created_at timestamptz not null default now()
);

create table public.home_members (
  home_id uuid not null references public.homes on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (home_id, user_id)
);

-- ---------- Catálogo de categorías (un producto puede tener varias) ----------
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  emoji text not null default '📦',
  color text not null default '#94a3b8',
  is_default boolean not null default true,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

-- ---------- Unidades configurables ----------
create table public.units (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  symbol text not null default ''
);

-- ---------- Productos ----------
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid not null references public.homes on delete cascade,
  name text not null,
  quantity integer not null default 0 check (quantity >= 0),
  unit text not null default 'Unidad',
  min_quantity integer not null default 0 check (min_quantity >= 0),
  photo_url text,
  emoji text not null default '🛒',
  notes text,
  expiry_date date,
  barcode text,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_home_idx on public.products (home_id);
create index products_name_idx on public.products (lower(name));

create table public.product_categories (
  product_id uuid not null references public.products on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  primary key (product_id, category_id)
);

-- ---------- Lista de mercado ----------
create table public.shopping_items (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid not null references public.homes on delete cascade,
  name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  unit text not null default 'Unidad',
  note text,
  product_id uuid references public.products on delete set null,
  checked boolean not null default false,
  added_by uuid references auth.users,
  checked_by uuid references auth.users,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shopping_home_idx on public.shopping_items (home_id);

-- ---------- Auditoría de actividad ----------
create table public.inventory_events (
  id bigint generated always as identity primary key,
  home_id uuid references public.homes on delete cascade,
  user_id uuid references auth.users,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index events_home_idx on public.inventory_events (home_id, created_at desc);

-- ============================================================
-- Triggers
-- ============================================================

create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.fn_set_updated_at();
create trigger trg_products_updated before update on public.products
  for each row execute function public.fn_set_updated_at();
create trigger trg_shopping_updated before update on public.shopping_items
  for each row execute function public.fn_set_updated_at();

-- Perfil automático al registrarse
create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

-- Auditoría automática de productos
create or replace function public.fn_log_product_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_details jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'creado';
    v_details := jsonb_build_object('name', new.name, 'quantity', new.quantity, 'unit', new.unit);
  elsif tg_op = 'DELETE' then
    v_action := 'eliminado';
    v_details := jsonb_build_object('name', old.name, 'quantity', old.quantity, 'unit', old.unit);
  else
    v_action := 'actualizado';
    v_details := jsonb_build_object(
      'before', jsonb_build_object('name', old.name, 'quantity', old.quantity, 'unit', old.unit, 'min_quantity', old.min_quantity, 'expiry_date', old.expiry_date),
      'after', jsonb_build_object('name', new.name, 'quantity', new.quantity, 'unit', new.unit, 'min_quantity', new.min_quantity, 'expiry_date', new.expiry_date)
    );
  end if;

  insert into public.inventory_events (home_id, user_id, action, entity_type, entity_id, details)
  values (coalesce(new.home_id, old.home_id), auth.uid(), v_action, 'producto', coalesce(new.id, old.id), v_details);
  return coalesce(new, old);
end $$;

create trigger trg_products_audit
  after insert or update or delete on public.products
  for each row execute function public.fn_log_product_event();

-- Auditoría automática de lista de mercado
create or replace function public.fn_log_shopping_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.inventory_events (home_id, user_id, action, entity_type, entity_id, details)
    values (new.home_id, auth.uid(), 'agregado a la lista', 'lista', new.id,
            jsonb_build_object('name', new.name, 'quantity', new.quantity));
  elsif tg_op = 'DELETE' then
    insert into public.inventory_events (home_id, user_id, action, entity_type, entity_id, details)
    values (old.home_id, auth.uid(), 'eliminado de la lista', 'lista', old.id,
            jsonb_build_object('name', old.name, 'quantity', old.quantity));
  end if;
  return coalesce(new, old);
end $$;

create trigger trg_shopping_audit
  after insert or delete on public.shopping_items
  for each row execute function public.fn_log_shopping_event();

-- ============================================================
-- Funciones RPC (operaciones atómicas)
-- ============================================================

-- Crear hogar (dueño + miembro)
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

  return v_home_id;
end $$;

-- Unirse a un hogar por código
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

  return v_home_id;
end $$;

-- Marcar como comprado: incrementa inventario automáticamente
create or replace function public.mark_purchased(p_item_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_item shopping_items%rowtype;
  v_home_id uuid;
  v_product_id uuid;
begin
  select * into v_item from public.shopping_items where id = p_item_id;
  if v_item is null then
    raise exception 'Ítem no encontrado';
  end if;

  select home_id into v_home_id from public.home_members where user_id = auth.uid() limit 1;
  if v_home_id is distinct from v_item.home_id then
    raise exception 'No perteneces a este hogar';
  end if;

  if v_item.checked then
    return;
  end if;

  v_product_id := v_item.product_id;

  if v_product_id is null then
    insert into public.products (home_id, name, quantity, unit, created_by, updated_by)
    values (v_item.home_id, v_item.name, v_item.quantity, v_item.unit, auth.uid(), auth.uid())
    returning id into v_product_id;

    update public.shopping_items set product_id = v_product_id where id = p_item_id;
  else
    update public.products
    set quantity = quantity + v_item.quantity,
        updated_by = auth.uid()
    where id = v_product_id;
  end if;

  update public.shopping_items
  set checked = true,
      checked_by = auth.uid(),
      purchased_at = now()
  where id = p_item_id;

  insert into public.inventory_events (home_id, user_id, action, entity_type, entity_id, details)
  values (v_item.home_id, auth.uid(), 'comprado', 'producto', v_product_id,
          jsonb_build_object('name', v_item.name, 'quantity', v_item.quantity));
end $$;

-- Ajustar cantidad de producto (delta puede ser negativo)
create or replace function public.adjust_quantity(p_product_id uuid, p_delta integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_new integer;
begin
  update public.products p
  set quantity = greatest(0, p.quantity + p_delta), updated_by = auth.uid()
  from public.home_members hm
  where p.id = p_product_id and hm.user_id = auth.uid() and hm.home_id = p.home_id
  returning p.quantity into v_new;

  if v_new is null then
    raise exception 'No tienes acceso a este producto';
  end if;
  return v_new;
end $$;

-- Agregar productos en lote (desde escaneo de factura / IA)
create or replace function public.batch_add_products(p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_home_id uuid;
  v_count integer := 0;
  v_product_id uuid;
begin
  select home_id into v_home_id from public.home_members where user_id = auth.uid() limit 1;
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

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.categories enable row level security;
alter table public.units enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.shopping_items enable row level security;
alter table public.inventory_events enable row level security;

-- Helper: ¿el usuario pertenece al hogar?
create or replace function public.is_member(p_home_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.home_members
    where home_id = p_home_id and user_id = auth.uid()
  );
$$;

-- profiles: cada usuario ve y edita su propio perfil
create policy "perfiles: propio" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- homes: lectura por miembros. Creación solo vía RPC create_home()
create policy "homes: ver si eres miembro" on public.homes
  for select using (public.is_member(id) or owner_id = auth.uid());

-- home_members: lectura del propio hogar. Unirse solo vía RPC join_home()
create policy "members: ver del propio hogar" on public.home_members
  for select using (public.is_member(home_id));
create policy "members: salirse o editar" on public.home_members
  for update using (public.is_member(home_id));

-- categories: lectura pública para autenticados, edición por miembros de algún hogar
create policy "categories: leer" on public.categories
  for select using (auth.role() = 'authenticated');
create policy "categories: gestionar" on public.categories
  for all using (
    auth.role() = 'authenticated' and
    exists (select 1 from public.home_members where user_id = auth.uid())
  ) with check (auth.role() = 'authenticated');

-- units: lectura para autenticados
create policy "units: leer" on public.units
  for select using (auth.role() = 'authenticated');

-- products
create policy "products: crud del hogar" on public.products
  for all using (public.is_member(home_id)) with check (public.is_member(home_id));

-- product_categories
create policy "product_categories: crud del hogar" on public.product_categories
  for all using (
    exists (
      select 1 from public.products p
      where p.id = product_id and public.is_member(p.home_id)
    )
  ) with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and public.is_member(p.home_id)
    )
  );

-- shopping_items
create policy "shopping: crud del hogar" on public.shopping_items
  for all using (public.is_member(home_id)) with check (public.is_member(home_id));

-- inventory_events
create policy "events: insertar propios" on public.inventory_events
  for insert with check (user_id = auth.uid());
create policy "events: leer del hogar" on public.inventory_events
  for select using (public.is_member(home_id));

-- ============================================================
-- Realtime (patrón Observer)
-- ============================================================

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.inventory_events;
alter publication supabase_realtime add table public.home_members;
alter publication supabase_realtime add table public.profiles;

-- ============================================================
-- Storage
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "product-photos: leer público" on storage.objects
  for select using (bucket_id = 'product-photos');
create policy "product-photos: subir autenticado" on storage.objects
  for insert with check (bucket_id = 'product-photos' and auth.role() = 'authenticated');
create policy "product-photos: actualizar" on storage.objects
  for update using (bucket_id = 'product-photos' and auth.role() = 'authenticated');
create policy "product-photos: eliminar" on storage.objects
  for delete using (bucket_id = 'product-photos' and auth.role() = 'authenticated');

-- ============================================================
-- Datos semilla
-- ============================================================

insert into public.categories (name, emoji, color, is_default) values
  ('Despensa', '🥫', '#eab308', true),
  ('Nevera', '🧊', '#0ea5e9', true),
  ('Frutas y Verduras', '🥦', '#22c55e', true),
  ('Carnes y Proteínas', '🥩', '#ef4444', true),
  ('Lácteos', '🥛', '#8b5cf6', true),
  ('Panadería', '🥖', '#f59e0b', true),
  ('Limpieza', '🧼', '#14b8a6', true),
  ('Aseo Personal', '🧴', '#ec4899', true),
  ('Mascotas', '🐾', '#a855f7', true),
  ('Bebidas', '🥤', '#3b82f6', true),
  ('Desayuno', '🥞', '#f97316', true),
  ('Snacks', '🍿', '#d946ef', true),
  ('Congelados', '❄️', '#06b6d4', true),
  ('Condimentos', '🧂', '#84cc16', true),
  ('Otros', '📦', '#94a3b8', true);

insert into public.units (name, symbol) values
  ('Unidad', 'unid'),
  ('Caja', 'caja'),
  ('Bolsa', 'bolsa'),
  ('Botella', 'botella'),
  ('Lata', 'lata'),
  ('Paquete', 'paq'),
  ('Kilogramo', 'kg'),
  ('Libra', 'lb'),
  ('Litro', 'L'),
  ('Mililitro', 'ml'),
  ('Gramo', 'g');
