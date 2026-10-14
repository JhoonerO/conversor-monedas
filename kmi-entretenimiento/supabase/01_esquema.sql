-- Kmi Entretenimiento · esquema de base de datos
-- Pégalo completo en Supabase → SQL Editor → New query → Run.
-- Quién puede hacer qué:
--   · Clientes (sin sesión): ven el catálogo y la info de la tienda, y crean pedidos. Nada más.
--   · Vendedor (con sesión y correo en la tabla admins): lee y edita todo.

-- ---------- tablas ----------
create table if not exists public.admins (
  email text primary key
);

create table if not exists public.providers (
  id text primary key,
  name text not null check (length(name) between 1 and 80),
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  type text not null default 'single' check (type in ('single','combo')),
  name text not null check (length(name) between 1 and 80),
  mono text,
  cat text not null default 'video',
  descr text not null default '',
  hue int not null default 220,
  price int not null default 0 check (price >= 0),
  cost int not null default 0 check (cost >= 0),          -- privado: solo lo ve el vendedor
  days int not null default 30 check (days > 0),
  active boolean not null default true,                    -- false = oculto en la tienda
  stock text not null default 'ok' check (stock in ('ok','agotado')),
  provider_id text references public.providers(id) on delete set null,  -- privado
  items text[] not null default '{}',                      -- productos que trae un combo
  badge text,
  cover_url text,
  logo_url text,
  sort int not null default 100,
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.providers(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  cost int check (cost >= 0),     -- null = precio por confirmar
  price int check (price >= 0),
  unique (provider_id, product_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  product_id text not null references public.products(id),
  provider_id text references public.providers(id) on delete set null,
  start_date date not null default current_date,
  end_date date not null,
  account text not null default '',   -- correo / perfil / PIN entregado
  notified date,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  product_id text not null references public.products(id),
  client_id uuid references public.clients(id) on delete set null,
  provider_id text references public.providers(id) on delete set null,
  price int not null,
  cost int not null,
  kind text not null default 'nueva' check (kind in ('nueva','renovación'))
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null check (length(code) <= 20),
  product_id text not null references public.products(id),
  name text not null check (length(name) between 1 and 120),
  phone text not null default '' check (length(phone) <= 20),
  status text not null default 'pendiente' check (status in ('pendiente','confirmado','cancelado')),
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  store text not null default 'Kmi Entretenimiento',
  phone text not null default '',
  warn_days int not null default 5,
  template text not null default ''
);

-- ---------- quién es vendedor ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = auth.jwt() ->> 'email');
$$;

-- ---------- seguridad (RLS) ----------
alter table public.admins        enable row level security;
alter table public.providers     enable row level security;
alter table public.products      enable row level security;
alter table public.offers        enable row level security;
alter table public.clients       enable row level security;
alter table public.subscriptions enable row level security;
alter table public.sales         enable row level security;
alter table public.orders        enable row level security;
alter table public.settings      enable row level security;

do $$ declare t text; begin
  foreach t in array array['providers','products','offers','clients','subscriptions','sales','orders','settings'] loop
    execute format('drop policy if exists "vendedor todo" on public.%I', t);
    execute format('create policy "vendedor todo" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "vendedor ve admins" on public.admins;
create policy "vendedor ve admins" on public.admins for select to authenticated using (public.is_admin());

-- los clientes solo pueden crear pedidos pendientes (no pueden leer ninguno)
drop policy if exists "clientes crean pedidos" on public.orders;
create policy "clientes crean pedidos" on public.orders for insert to anon, authenticated
  with check (status = 'pendiente');

-- ---------- lo que ve el público (sin costos ni proveedores) ----------
create or replace view public.catalogo as
  select id, type, name, mono, cat, descr, hue, price, days, stock, items, badge, cover_url, logo_url, sort
  from public.products where active;

create or replace view public.tienda_info as
  select store, phone from public.settings where id = 1;

revoke all on public.catalogo, public.tienda_info from anon, authenticated;
grant select on public.catalogo, public.tienda_info to anon, authenticated;

-- ---------- imágenes (portadas y logos) ----------
insert into storage.buckets (id, name, public) values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;

drop policy if exists "vendedor sube imagenes" on storage.objects;
create policy "vendedor sube imagenes" on storage.objects for all to authenticated
  using (bucket_id = 'imagenes' and public.is_admin())
  with check (bucket_id = 'imagenes' and public.is_admin());
