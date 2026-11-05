create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.phone, new.raw_user_meta_data->>'phone'));
  insert into public.user_roles (user_id, role) values (new.id, 'member');
  if lower(new.email) = 'coffeechampionsassociation@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = 'coffeechampionsassociation@gmail.com'
on conflict do nothing;