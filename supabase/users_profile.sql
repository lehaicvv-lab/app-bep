create extension if not exists pgcrypto;

create table if not exists users_profile (
  id uuid primary key default gen_random_uuid(),
  username text unique,
  password text,
  full_name text,
  role text,
  permissions jsonb,
  active boolean default true,
  created_at timestamp default now()
);

insert into users_profile (username, password, full_name, role, permissions, active)
values (
  'admin',
  '123456',
  'Administrator',
  'admin',
  '{"pages":{"dashboard":true,"baocaongay":true,"doixe":true,"thietbi":true,"antoan":true,"nhansu":true,"bieumau":true,"danhmuc":true,"taikhoan":true},"reportTabs":{"summary":true,"management":true,"service":true,"accounting":true,"warehouse":true,"bep":true},"actions":{"view":true,"create":true,"edit":true,"delete":true,"print":true}}'::jsonb,
  true
)
on conflict (username) do nothing;
