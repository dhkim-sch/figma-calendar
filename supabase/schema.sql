-- Figma Calendar 교육용 개발 프로젝트 스키마
--
-- 중요:
-- 1. 실제 개인정보가 없는 개발/테스트 Supabase 프로젝트에서만 사용하세요.
-- 2. Supabase Dashboard에서 Anonymous Sign-Ins를 활성화한 뒤 사용하세요.
-- 3. 이 파일은 기존 테이블을 삭제하거나 데이터를 지우지 않습니다.
-- 4. 실행 전 테이블, 컬럼, RLS 정책 충돌 여부를 사람이 검토해야 합니다.

create extension if not exists "pgcrypto";

create table if not exists public.schedule_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color_key text not null check (color_key in ('green', 'red', 'gold', 'mint', 'violet', 'blue')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  event_date date not null,
  start_time time,
  end_time time,
  category_id uuid references public.schedule_categories(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_events_time_order_check
    check (end_time is null or start_time is null or end_time > start_time)
);

create index if not exists schedule_events_user_date_idx
  on public.schedule_events (user_id, event_date, start_time);

create index if not exists schedule_events_category_idx
  on public.schedule_events (category_id);

alter table public.schedule_categories enable row level security;
alter table public.schedule_events enable row level security;

-- 익명 로그인 사용자는 Postgres의 authenticated 역할로 요청합니다.
-- 공개 anon 역할에는 테이블 권한을 부여하지 않습니다.
revoke all on table public.schedule_categories from anon;
revoke all on table public.schedule_events from anon;

revoke all on table public.schedule_categories from authenticated;
revoke all on table public.schedule_events from authenticated;

grant select on table public.schedule_categories to authenticated;
grant select, insert on table public.schedule_events to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'schedule_categories'
      and policyname = 'Authenticated users can read categories'
  ) then
    create policy "Authenticated users can read categories"
      on public.schedule_categories
      for select
      to authenticated
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'schedule_events'
      and policyname = 'Users can read their own events'
  ) then
    create policy "Users can read their own events"
      on public.schedule_events
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'schedule_events'
      and policyname = 'Users can create their own events'
  ) then
    create policy "Users can create their own events"
      on public.schedule_events
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end
$$;

insert into public.schedule_categories (name, color_key, sort_order)
values
  ('업무', 'green', 1),
  ('회의', 'blue', 2),
  ('마감', 'red', 3),
  ('개인', 'gold', 4),
  ('건강', 'mint', 5),
  ('학습', 'violet', 6)
on conflict (name) do nothing;

-- 이 스키마는 일정 수정/삭제 권한을 제공하지 않습니다.
-- 실제 앱으로 확장할 때는 update/delete 정책을 별도로 검토하세요.
