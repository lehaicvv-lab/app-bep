create extension if not exists pgcrypto;

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  user_id uuid,
  username text not null,
  full_name text,
  role text,
  module text not null,
  department text not null,
  site text not null default '',
  data jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists daily_reports_unique_report
  on public.daily_reports (report_date, username, module, department, site);

create index if not exists idx_daily_reports_report_date on public.daily_reports (report_date);
create index if not exists idx_daily_reports_username on public.daily_reports (username);
create index if not exists idx_daily_reports_module on public.daily_reports (module);

create or replace function public.set_daily_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_daily_reports_updated_at on public.daily_reports;
create trigger trg_daily_reports_updated_at
before update on public.daily_reports
for each row
execute function public.set_daily_reports_updated_at();
