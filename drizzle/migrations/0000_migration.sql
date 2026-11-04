create type public.app_role as enum ('admin', 'member');
create type public.member_status as enum ('pending', 'approved', 'rejected');
create type public.member_type as enum ('farmer', 'cooperative', 'barista', 'roaster', 'trader', 'enterprise', 'other');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 20),
  county text check (char_length(county) <= 40),
  member_type public.member_type,
  business_name text check (char_length(business_name) <= 150),
  farm_size text check (char_length(farm_size) <= 60),
  photo_path text check (char_length(photo_path) <= 300),
  status public.member_status not null default 'pending',
  member_no text unique,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Members read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Members update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins update profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Members cannot approve themselves: only admins may change status / member number
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    new.status := old.status;
    new.member_no := old.member_no;
    new.reviewed_at := old.reviewed_at;
    new.email := old.email;
  elsif new.status is distinct from old.status then
    new.reviewed_at := now();
    if new.status = 'approved' and new.member_no is null then
      new.member_no := 'CCAK-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random()*100000))::text, 5, '0');
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.phone, new.raw_user_meta_data->>'phone'));
  insert into public.user_roles (user_id, role) values (new.id, 'member');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('partner', 'donate')),
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 255),
  phone text check (char_length(phone) <= 20),
  county text check (char_length(county) <= 40),
  message text check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);
grant insert on public.inquiries to anon, authenticated;
grant select, delete on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
alter table public.inquiries enable row level security;
create policy "Anyone can submit inquiries" on public.inquiries for insert to anon, authenticated with check (true);
create policy "Admins read inquiries" on public.inquiries for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete inquiries" on public.inquiries for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 255),
  created_at timestamptz not null default now()
);
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, delete on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;
alter table public.newsletter_subscribers enable row level security;
create policy "Anyone can subscribe" on public.newsletter_subscribers for insert to anon, authenticated with check (true);
create policy "Admins read subscribers" on public.newsletter_subscribers for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete subscribers" on public.newsletter_subscribers for delete to authenticated using (public.has_role(auth.uid(), 'admin'));