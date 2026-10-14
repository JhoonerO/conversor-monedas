-- Roles (admin / dev), registro de actividad y ventas a crédito con abonos.
-- Correr después de 01, 02 y 03.

-- ---------- roles ----------
alter table public.admins add column if not exists role text not null default 'admin';
do $$ begin
  alter table public.admins add constraint admins_role_chk check (role in ('admin','dev'));
exception when duplicate_object then null; end $$;

create or replace function public.is_dev() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = auth.jwt() ->> 'email' and role = 'dev');
$$;

-- el usuario dev (dev@kmi.local) se crea en Authentication → Users; aquí solo se le da el rol
insert into public.admins (email, role) values ('dev@kmi.local', 'dev')
on conflict do nothing;

-- ---------- ventas a crédito ----------
alter table public.sales add column if not exists method text not null default 'efectivo';
alter table public.sales add column if not exists due_date date;

create table if not exists public.payments (
  id text primary key default gen_random_uuid()::text,
  sale_id text not null references public.sales(id) on delete cascade,
  date date not null default current_date,
  amount integer not null check (amount > 0),
  method text not null default 'efectivo',
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "vendedor todo" on public.payments;
create policy "vendedor todo" on public.payments for all to authenticated using (is_admin()) with check (is_admin());

-- ---------- registro de actividad (solo lo lee el dev; nadie lo puede editar ni borrar) ----------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,          -- crear | editar | borrar | entrar | salir
  entity text not null,
  entity_id text,
  summary text not null default '',
  old_data jsonb,
  new_data jsonb
);
alter table public.audit_log enable row level security;
drop policy if exists "dev lee logs" on public.audit_log;
create policy "dev lee logs" on public.audit_log for select to authenticated using (is_dev());
create index if not exists audit_log_at_idx on public.audit_log (at desc);

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who text := coalesce(auth.jwt() ->> 'email', case when auth.role() = 'anon' then 'cliente (tienda)' else 'sistema' end);
  rec jsonb := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if TG_OP = 'UPDATE' and to_jsonb(new) = to_jsonb(old) then return new; end if;
  insert into public.audit_log (actor, action, entity, entity_id, old_data, new_data)
  values (who,
          case TG_OP when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'borrar' end,
          TG_TABLE_NAME, rec ->> 'id',
          case when TG_OP <> 'INSERT' then to_jsonb(old) end,
          case when TG_OP <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['providers','products','offers','clients','subscriptions','sales','payments','orders','settings','admins'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- entradas y salidas del panel
create or replace function public.log_event(p_action text, p_summary text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return; end if;
  if p_action not in ('entrar', 'salir') then raise exception 'acción no permitida'; end if;
  insert into public.audit_log (actor, action, entity, summary)
  values (auth.jwt() ->> 'email', p_action, 'sesion', left(coalesce(p_summary, ''), 200));
end $$;
revoke all on function public.log_event(text, text) from public, anon;
grant execute on function public.log_event(text, text) to authenticated;
