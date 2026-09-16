-- ============================================================
-- Tenshi.id — Neon (Postgres) database schema — versi standalone
-- Otomatis dijalankan saat server dinyalakan (lihat index.js),
-- atau bisa juga dijalankan manual via Neon SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- MEMBERS (users + auth). id di-generate sendiri (tidak ada
-- auth.users seperti Nhost). Password disimpan sebagai hash
-- bcrypt oleh backend.
-- ------------------------------------------------------------
create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  username      text not null,
  password_hash text not null,
  role          text not null default 'user' check (role in ('user','admin')),
  created_at    timestamptz not null default now()
);

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
  shinigami_id   text,
  alternative_names text[] default '{}',
  tags           text[] default '{}',
  views_count    bigint not null default 0,
  follows_count  bigint not null default 0,
  rating         numeric(3,2) not null default 0,
  rating_count   int not null default 0,
  release_date   date,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- GENRE + relasi
-- ------------------------------------------------------------
create table if not exists public.genres (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.manga_genres (
  manga_id uuid not null references public.manga(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (manga_id, genre_id)
);

-- ------------------------------------------------------------
-- AUTHOR + relasi (name unik supaya bisa auto-create)
-- ------------------------------------------------------------
create table if not exists public.authors (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  role       text default 'author' check (role in ('author','artist')),
  created_at timestamptz not null default now()
);

create table if not exists public.manga_authors (
  manga_id  uuid not null references public.manga(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete cascade,
  primary key (manga_id, author_id)
);

-- ------------------------------------------------------------
-- CHAPTER + halaman (pages jsonb)
-- ------------------------------------------------------------
create table if not exists public.chapters (
  id            uuid primary key default gen_random_uuid(),
  manga_id      uuid not null references public.manga(id) on delete cascade,
  name          text not null,
  type          text not null default 'chapter' check (type in ('chapter','special')),
  sort_order    int not null default 0,
  release_timestamp bigint not null,
  pages         jsonb not null default '[]',
  pdf_url       text
);

-- Kolom pdf_url untuk chapter yang sudah ada (safety)
alter table public.chapters add column if not exists pdf_url text;
alter table public.manga add column if not exists shinigami_id text;
create unique index if not exists idx_manga_shinigami_id on public.manga(shinigami_id) where shinigami_id is not null;

-- ------------------------------------------------------------
-- FAVORIT (library) — member -> manga
-- ------------------------------------------------------------
create table if not exists public.likes (
  user_id    uuid not null references public.members(id) on delete cascade,
  manga_id   uuid not null references public.manga(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, manga_id)
);

-- Trigger: otomatis update follows_count
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

create index if not exists idx_manga_genre on public.manga_genres(genre_id);
create index if not exists idx_chapter_manga on public.chapters(manga_id);
create index if not exists idx_chapters_manga_sort on public.chapters(manga_id, sort_order);
create index if not exists idx_likes_user on public.likes(user_id);
create index if not exists idx_likes_manga on public.likes(manga_id);
create index if not exists idx_manga_type on public.manga(type);
create index if not exists idx_manga_created_at on public.manga(created_at desc);
create index if not exists idx_manga_views on public.manga(views_count desc);
create index if not exists idx_manga_follows on public.manga(follows_count desc);
create index if not exists idx_manga_rating on public.manga(rating desc);
create index if not exists idx_manga_authors_manga on public.manga_authors(manga_id);

-- ------------------------------------------------------------
-- RIWAYAT BACA — posisi terakhir user per judul (1 baris per user+judul)
-- ------------------------------------------------------------
create table if not exists public.history (
  user_id     uuid not null references public.members(id) on delete cascade,
  manga_id    uuid not null references public.manga(id) on delete cascade,
  chapter_id  uuid,
  chapter_name text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (user_id, manga_id)
);

create index if not exists idx_history_user_updated on public.history(user_id, updated_at desc);

