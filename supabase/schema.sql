create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id integer primary key default 1,
  meta_title text,
  meta_description text,
  profile_name text,
  profile_chinese_name text,
  profile_role text,
  profile_subtitle text,
  profile_location text,
  profile_short_bio text,
  profile_about text,
  profile_portrait text,
  contact_email text,
  contact_phone text,
  contact_wechat text,
  pages jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.categories (
  title text primary key,
  summary text default '',
  sort_order integer default 0
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  year text default '',
  location text default '',
  summary text default '',
  description text default '',
  cover_image_url text,
  published boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  alt text default '',
  width integer,
  height integer,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.site_settings enable row level security;
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;

drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings"
on public.site_settings for select
using (true);

drop policy if exists "public read categories" on public.categories;
create policy "public read categories"
on public.categories for select
using (true);

drop policy if exists "public read projects" on public.projects;
create policy "public read projects"
on public.projects for select
using (published = true or auth.role() = 'authenticated');

drop policy if exists "public read project images" on public.project_images;
create policy "public read project images"
on public.project_images for select
using (true);

drop policy if exists "authenticated manage site settings" on public.site_settings;
create policy "authenticated manage site settings"
on public.site_settings for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated manage categories" on public.categories;
create policy "authenticated manage categories"
on public.categories for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated manage projects" on public.projects;
create policy "authenticated manage projects"
on public.projects for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated manage project images" on public.project_images;
create policy "authenticated manage project images"
on public.project_images for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

drop policy if exists "public read storage" on storage.objects;
create policy "public read storage"
on storage.objects for select
using (bucket_id = 'portfolio');

drop policy if exists "authenticated upload storage" on storage.objects;
create policy "authenticated upload storage"
on storage.objects for insert
with check (bucket_id = 'portfolio' and auth.role() = 'authenticated');

drop policy if exists "authenticated update storage" on storage.objects;
create policy "authenticated update storage"
on storage.objects for update
using (bucket_id = 'portfolio' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete storage" on storage.objects;
create policy "authenticated delete storage"
on storage.objects for delete
using (bucket_id = 'portfolio' and auth.role() = 'authenticated');

