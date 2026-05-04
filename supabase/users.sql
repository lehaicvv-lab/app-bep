create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'manager', 'staff')),
  area text not null default '',
  modules text[] not null default '{}',
  active boolean not null default true,
  created_at timestamp without time zone not null default now()
);

create index if not exists idx_users_username on public.users (username);
create index if not exists idx_users_role on public.users (role);
create index if not exists idx_users_active on public.users (active);

create or replace function public.login_user(username_input text, password_input text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where lower(username) = lower(username_input)
      and active = true
      and password = crypt(password_input, password)
  );
$$;

create or replace function public.create_user(
  username_input text,
  password_input text,
  full_name_input text,
  role_input text,
  area_input text,
  modules_input text[],
  active_input boolean default true
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_user public.users;
begin
  if nullif(trim(username_input), '') is null then
    raise exception 'username_input is required';
  end if;

  if nullif(password_input, '') is null then
    raise exception 'password_input is required';
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
    trim(username_input),
    crypt(password_input, gen_salt('bf')),
    trim(full_name_input),
    role_input,
    coalesce(area_input, ''),
    coalesce(modules_input, '{}'::text[]),
    coalesce(active_input, true)
  )
  returning * into inserted_user;

  return inserted_user;
end;
$$;

grant execute on function public.login_user(text, text) to anon, authenticated;
grant execute on function public.create_user(text, text, text, text, text, text[], boolean) to anon, authenticated;

insert into public.users (username, password, full_name, role, area, modules, active)
values
  (
    'admin',
    crypt('123456', gen_salt('bf')),
    'Administrator',
    'admin',
    'Toan he thong',
    array[
      'dashboard',
      'baocao',
      'summary',
      'management',
      'service',
      'accounting',
      'warehouse',
      'bep',
      'doixe',
      'thietbi',
      'antoan',
      'nhansu',
      'bieumau',
      'danhmuc',
      'taikhoan'
    ]::text[],
    true
  ),
  (
    'manager.ops',
    crypt('123456', gen_salt('bf')),
    'Quan ly Van hanh',
    'manager',
    'Khu vuc Trung tam',
    array[
      'dashboard',
      'baocao',
      'summary',
      'management',
      'service',
      'accounting',
      'warehouse',
      'bep',
      'doixe',
      'thietbi',
      'antoan',
      'nhansu',
      'bieumau'
    ]::text[],
    true
  ),
  (
    'staff.kho',
    crypt('123456', gen_salt('bf')),
    'Nhan vien Ke toan kho',
    'staff',
    'Kho Tong',
    array[
      'baocao',
      'summary',
      'accounting'
    ]::text[],
    true
  ),
  (
    'staff.bep',
    crypt('123456', gen_salt('bf')),
    'Nhan vien Bep',
    'staff',
    'Bep Chinh',
    array[
      'baocao',
      'summary',
      'bep'
    ]::text[],
    true
  )
on conflict (username) do update
set
  password = excluded.password,
  full_name = excluded.full_name,
  role = excluded.role,
  area = excluded.area,
  modules = excluded.modules,
  active = excluded.active;
