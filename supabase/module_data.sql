create extension if not exists pgcrypto;

create table if not exists public.module_data (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  record_date date not null,
  user_id uuid,
  username text,
  full_name text,
  role text,
  site text not null default '',
  department text not null default '',
  area text not null default '',
  data jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists module_data_unique_entry
  on public.module_data (module, record_date, username, site, department, area);

create index if not exists idx_module_data_module on public.module_data (module);
create index if not exists idx_module_data_record_date on public.module_data (record_date);
create index if not exists idx_module_data_username on public.module_data (username);
create index if not exists idx_module_data_site on public.module_data (site);

create or replace function public.set_module_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_module_data_updated_at on public.module_data;
create trigger trg_module_data_updated_at
before update on public.module_data
for each row
execute function public.set_module_data_updated_at();
