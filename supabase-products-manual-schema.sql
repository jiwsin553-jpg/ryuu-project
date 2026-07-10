create table if not exists public.products (
  id text primary key,
  name text not null,
  short_description text default '',
  description text default '',
  features jsonb not null default '[]'::jsonb,
  price numeric(10, 2) not null default 0,
  stock integer not null default 0,
  available boolean not null default false,
  image text default '',
  sales integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists short_description text default '';
alter table public.products add column if not exists description text default '';
alter table public.products add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists price numeric(10, 2) not null default 0;
alter table public.products add column if not exists stock integer not null default 0;
alter table public.products add column if not exists available boolean not null default false;
alter table public.products add column if not exists image text default '';
alter table public.products add column if not exists sales integer not null default 0;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'slug') then
    alter table public.products alter column slug drop not null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'sku') then
    alter table public.products alter column sku drop not null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'imageUrl') then
    alter table public.products alter column "imageUrl" drop not null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'categoryId') then
    alter table public.products alter column "categoryId" drop not null;
  end if;
end $$;

alter table public.products enable row level security;

drop policy if exists "Produtos visiveis para todos" on public.products;
create policy "Produtos visiveis para todos"
on public.products for select
using (true);

drop policy if exists "Admins gerenciam produtos" on public.products;
create policy "Admins gerenciam produtos"
on public.products for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'administrador'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'administrador'
  )
);
