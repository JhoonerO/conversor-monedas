-- La página genera sus propios ids cortos (texto), así que las tablas usan ids de texto.
alter table public.subscriptions drop constraint if exists subscriptions_client_id_fkey;
alter table public.sales drop constraint if exists sales_client_id_fkey;
alter table public.offers alter column id drop default, alter column id type text using id::text, alter column id set default gen_random_uuid()::text;
alter table public.clients alter column id drop default, alter column id type text using id::text, alter column id set default gen_random_uuid()::text;
alter table public.subscriptions alter column id drop default, alter column id type text using id::text, alter column id set default gen_random_uuid()::text;
alter table public.subscriptions alter column client_id type text using client_id::text;
alter table public.sales alter column id drop default, alter column id type text using id::text, alter column id set default gen_random_uuid()::text;
alter table public.sales alter column client_id type text using client_id::text;
alter table public.orders alter column id drop default, alter column id type text using id::text, alter column id set default gen_random_uuid()::text;
alter table public.subscriptions add constraint subscriptions_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade;
alter table public.sales add constraint sales_client_id_fkey foreign key (client_id) references public.clients(id) on delete set null;
update public.offers set id = provider_id || '-' || product_id;
