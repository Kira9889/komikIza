-- ============================================================
-- Tenshi.id — Digital Manga Library database schema (Supabase)
-- Jalankan script ini via Supabase SQL Editor / Supabase CLI.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- MANGA / KOMIK
-- ------------------------------------------------------------
create table if not exists public.manga (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  original_name  text,
  type           text not null check (type in ('manhwa','manga','manhua')),
  status         text not null default 'Ongoing' check (status in ('Ongoing','Completed','Hiatus','Dropped')),
  description    text,
  cover_url      text,
  banner_url     text,
  alternative_names text[] default '{}',
  views_count    bigint not null default 0,
  follows_count  bigint not null default 0,
  rating         numeric(3,2) not null default 0,
  rating_count   int not null default 0,
  release_date   date,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- GENRE + relasi banyak-ke-banyak
-- ------------------------------------------------------------
create table if not exists public.genres (
  id      uuid primary key default gen_random_uuid(),
  name    text unique not null
);

create table if not exists public.manga_genres (
  manga_id uuid not null references public.manga(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (manga_id, genre_id)
);

-- ------------------------------------------------------------
-- AUTHOR + relasi
-- ------------------------------------------------------------
create table if not exists public.authors (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  role    text default 'author' check (role in ('author','artist'))
);

create table if not exists public.manga_authors (
  manga_id  uuid not null references public.manga(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete cascade,
  primary key (manga_id, author_id)
);

-- ------------------------------------------------------------
-- CHAPTER + halaman (pages)
-- ------------------------------------------------------------
create table if not exists public.chapters (
  id            uuid primary key default gen_random_uuid(),
  manga_id      uuid not null references public.manga(id) on delete cascade,
  name          text not null,
  type          text not null default 'chapter' check (type in ('chapter','special')),
  sort_order    int not null default 0,
  release_timestamp bigint not null,
  pages         jsonb not null default '[]'
);

-- ------------------------------------------------------------
-- USERS + progres baca + like/follow (butuh auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- terdapat tabel users bawaan auth Supabase (auth.users).
-- Tabel profil tambahan di atas menyimpan metadata publik.

create table if not exists public.read_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  manga_id   uuid not null references public.manga(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  page       int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, manga_id)
);

create table if not exists public.likes (
  user_id  uuid not null references auth.users(id) on delete cascade,
  manga_id uuid not null references public.manga(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, manga_id)
);

-- ------------------------------------------------------------
-- TRIGGER: otomatis update follows_count
-- ------------------------------------------------------------
create or replace function public.bump_follows()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.manga set follows_count = follows_count + 1 where id = new.manga_id;
  elsif tg_op = 'DELETE' then
    update public.manga set follows_count = follows_count - 1 where id = old.manga_id;
  end if;
  return new;
end $$;

drop trigger if exists likes_bump on public.likes;
create trigger likes_bump
  after insert or delete on public.likes
  for each row execute function public.bump_follows();

-- ------------------------------------------------------------
-- SECURITY (RLS)
-- ------------------------------------------------------------
alter table public.manga enable row level security;
alter table public.genres enable row level security;
alter table public.manga_genres enable row level security;
alter table public.authors enable row level security;
alter table public.manga_authors enable row level security;
alter table public.chapters enable row level security;
alter table public.profiles enable row level security;
alter table public.read_progress enable row level security;
alter table public.likes enable row level security;

-- Konten katalog boleh dibaca publik
create policy "public read manga"   on public.manga        for select using (true);
create policy "public read genres"  on public.genres       for select using (true);
create policy "public read mg"      on public.manga_genres for select using (true);
create policy "public read authors" on public.authors      for select using (true);
create policy "public read ma"      on public.manga_authors for select using (true);
create policy "public read chapters" on public.chapters    for select using (true);

-- Profil: user boleh baca & edit profil sendiri
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

-- Progres baca & like hanya untuk pemilik akun
create policy "own progress select" on public.read_progress for select using (auth.uid() = user_id);
create policy "own progress insert" on public.read_progress for insert with check (auth.uid() = user_id);
create policy "own progress update" on public.read_progress for update using (auth.uid() = user_id);
create policy "own progress delete" on public.read_progress for delete using (auth.uid() = user_id);

create policy "own likes select" on public.likes for select using (auth.uid() = user_id);
create policy "own likes insert" on public.likes for insert with check (auth.uid() = user_id);
create policy "own likes delete" on public.likes for delete using (auth.uid() = user_id);