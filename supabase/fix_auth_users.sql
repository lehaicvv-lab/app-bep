create extension if not exists pgcrypto;

alter table if exists public.users
  add column if not exists id uuid default gen_random_uuid();

alter table if exists public.users
  add column if not exists username text;

alter table if exists public.users
  add column if not exists password text;

alter table if exists public.users
  add column if not exists full_name text;

alter table if exists public.users
  add column if not exists role text;

alter table if exists public.users
  add column if not exists area text;

alter table if exists public.users
  add column if not exists active boolean default true;

alter table if exists public.users
  add column if not exists modules text[] default '{}'::text[];

update public.users
set username = lower(trim(username))
where username is not null
  and username <> lower(trim(username));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_pkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users add primary key (id);
  end if;
exception
  when duplicate_table then null;
  when duplicate_object then null;
end
$$;

create unique index if not exists idx_users_username_unique
on public.users (username);

create index if not exists idx_users_active on public.users (active);
create index if not exists idx_users_role on public.users (role);

create or replace function public.login_user(
  username_input text,
  password_input text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_record record;
  clean_username text;
begin
  clean_username := lower(trim(coalesce(username_input, '')));

  if clean_username = '' or coalesce(password_input, '') = '' then
    return false;
  end if;

  select *
  into user_record
  from public.users
  where lower(trim(username)) = clean_username
    and coalesce(active, true) = true
  limit 1;

  if user_record is null then
    return false;
  end if;

  if user_record.password = crypt(password_input, user_record.password) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.create_user(
  username_input text,
  password_input text
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_username text;
  inserted_user public.users;
begin
  clean_username := lower(trim(coalesce(username_input, '')));

  if clean_username = '' then
    raise exception 'username_input is required';
  end if;

  if nullif(trim(coalesce(password_input, '')), '') is null then
    raise exception 'password_input is required';
  end if;

  if exists (
    select 1
    from public.users
    where lower(trim(username)) = clean_username
  ) then
    raise exception 'Tài khoản "%" đã tồn tại.', clean_username;
  end if;

  insert into public.users (
    username,
    password,
    full_name,
    role,
    area,
    modules,
    active
  )
  values (
    clean_username,
    crypt(password_input, gen_salt('bf')),
    clean_username,
    'staff',
    '',
    '{}'::text[],
    true
  )
  returning * into inserted_user;

  return inserted_user;
end;
$$;

grant execute on function public.login_user(text, text) to anon, authenticated;
grant execute on function public.create_user(text, text) to anon, authenticated;

update public.users
set password = crypt('123456', gen_salt('bf'))
where lower(trim(username)) = lower(trim('test-login'));
