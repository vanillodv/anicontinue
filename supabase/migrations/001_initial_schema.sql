-- 1. Таблица Anime (каталог аниме)
create table public.anime (
  id bigint primary key,
  title_ru text,
  title_jp text,
  title_en text,
  synopsis text,
  genres jsonb default '[]'::jsonb,
  characters jsonb default '[]'::jsonb,
  poster_url text,
  score decimal(3,2),
  year integer,
  studio text,
  episodes integer,
  status text,
  prompt_template text,
  cached_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. Таблица Profiles (профили пользователей)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text,
  plan text default 'free',
  chapters_used integer default 0,
  chapters_limit integer default 3,
  subscription_expires_at timestamptz,
  created_at timestamptz default now()
);

-- 4. Таблица Characters (кастомные персонажи пользователей)
-- Создаем раньше Chapters, так как Chapters может на неё ссылаться
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  appearance text,
  personality text,
  ability text,
  relation text,
  appearances_count integer default 0,
  is_saved boolean default true,
  created_at timestamptz default now()
);

-- 3. Таблица Chapters (сгенерированные главы)
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  anime_id bigint not null references public.anime(id) on delete cascade,
  title text,
  content text not null,
  rating integer,
  scene_params jsonb default '{}'::jsonb,
  character_id uuid references public.characters(id) on delete set null,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- ВКЛЮЧЕНИЕ RLS (Row Level Security)
alter table public.anime enable row level security;
alter table public.profiles enable row level security;
alter table public.chapters enable row level security;
alter table public.characters enable row level security;

-- ПОЛИТИКИ RLS

-- Anime: видят все
create policy "Anime are viewable by everyone" 
on public.anime for select 
using (true);

-- Profiles: пользователь видит только свой профиль
create policy "Users can view own profile" 
on public.profiles for select 
using (auth.uid() = id);

create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = id);

-- Chapters: пользователь видит только свои главы (или публичные)
create policy "Users can view own chapters" 
on public.chapters for select 
using (auth.uid() = user_id or is_public = true);

create policy "Users can insert own chapters" 
on public.chapters for insert 
with check (auth.uid() = user_id);

create policy "Users can update own chapters" 
on public.chapters for update 
using (auth.uid() = user_id);

-- Characters: пользователь видит только своих персонажей
create policy "Users can view own characters" 
on public.characters for select 
using (auth.uid() = user_id);

create policy "Users can insert own characters" 
on public.characters for insert 
with check (auth.uid() = user_id);

create policy "Users can update own characters" 
on public.characters for update 
using (auth.uid() = user_id);
