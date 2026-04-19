-- Chapter comments
create table public.chapter_comments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) >= 1 and char_length(content) <= 1000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index chapter_comments_chapter_id_idx on public.chapter_comments(chapter_id);
create index chapter_comments_user_id_idx on public.chapter_comments(user_id);

-- Denormalised counter on chapters
alter table public.chapters add column if not exists comments_count integer not null default 0;

-- Trigger to keep counter in sync
create or replace function public.update_chapter_comments_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.chapters set comments_count = comments_count + 1 where id = NEW.chapter_id;
  elsif TG_OP = 'DELETE' then
    update public.chapters set comments_count = greatest(comments_count - 1, 0) where id = OLD.chapter_id;
  end if;
  return null;
end;
$$;

create trigger trg_chapter_comments_count
  after insert or delete on public.chapter_comments
  for each row execute function public.update_chapter_comments_count();

-- RLS
alter table public.chapter_comments enable row level security;

-- Anyone can read non-deleted comments
create policy "Anyone reads comments"
  on public.chapter_comments for select
  using (is_deleted = false);

-- Authenticated users can insert their own
create policy "Authenticated users add comments"
  on public.chapter_comments for insert
  with check (auth.uid() = user_id);

-- Users can soft-delete their own; admins can hard-delete
create policy "Users update own comments"
  on public.chapter_comments for update
  using (auth.uid() = user_id);

create policy "Users delete own comments"
  on public.chapter_comments for delete
  using (auth.uid() = user_id);
