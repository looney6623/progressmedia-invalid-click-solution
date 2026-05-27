-- ProgressMedia Supabase Auth + RLS schema draft
-- 실제 적용 전 기존 테이블명과 컬럼명을 마이그레이션에 맞게 조정하세요.

create table if not exists public.pm_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'marketer' check (role in ('admin', 'marketer')),
  team text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.pm_advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id text not null unique,
  status text not null default 'active',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.pm_marketer_advertisers (
  id uuid primary key default gen_random_uuid(),
  marketer_id uuid not null references public.pm_profiles(id) on delete cascade,
  advertiser_id uuid not null references public.pm_advertisers(id) on delete cascade,
  permission text not null default 'view' check (permission in ('manage', 'view')),
  assigned_at timestamp with time zone not null default now(),
  unique (marketer_id, advertiser_id)
);

-- 예시 데이터 테이블. 실제 서비스 테이블이 이미 있다면 advertiser_id 컬럼과 RLS만 맞춰 적용하세요.
create table if not exists public.pm_click_logs (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.pm_advertisers(id) on delete cascade,
  ip_hash text,
  ip_masked text,
  media text,
  campaign text,
  keyword text,
  status text check (status in ('normal', 'suspicious', 'blocked')),
  risk_score integer not null default 0,
  reason text,
  occurred_at timestamp with time zone not null default now()
);

create table if not exists public.pm_blocked_ips (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.pm_advertisers(id) on delete cascade,
  ip_hash text not null,
  ip_masked text,
  method text not null check (method in ('manual', 'auto')),
  reason text,
  created_by uuid references public.pm_profiles(id),
  starts_at timestamp with time zone not null default now(),
  ends_at timestamp with time zone,
  released_at timestamp with time zone
);

create table if not exists public.pm_reports (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references public.pm_advertisers(id) on delete cascade,
  report_date date not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_pm_profiles_role on public.pm_profiles(role);
create index if not exists idx_pm_marketer_advertisers_marketer on public.pm_marketer_advertisers(marketer_id);
create index if not exists idx_pm_marketer_advertisers_advertiser on public.pm_marketer_advertisers(advertiser_id);
create index if not exists idx_pm_click_logs_advertiser_time on public.pm_click_logs(advertiser_id, occurred_at desc);
create index if not exists idx_pm_blocked_ips_advertiser on public.pm_blocked_ips(advertiser_id);
create index if not exists idx_pm_reports_advertiser_date on public.pm_reports(advertiser_id, report_date desc);

alter table public.pm_profiles enable row level security;
alter table public.pm_advertisers enable row level security;
alter table public.pm_marketer_advertisers enable row level security;
alter table public.pm_click_logs enable row level security;
alter table public.pm_blocked_ips enable row level security;
alter table public.pm_reports enable row level security;

create or replace function public.pm_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pm_profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.pm_can_access_advertiser(target_advertiser_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.pm_is_admin()
    or exists (
      select 1
      from public.pm_marketer_advertisers ma
      join public.pm_profiles p on p.id = ma.marketer_id
      where ma.advertiser_id = target_advertiser_id
        and ma.marketer_id = auth.uid()
        and p.is_active = true
    );
$$;

create or replace function public.pm_can_manage_advertiser(target_advertiser_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.pm_is_admin()
    or exists (
      select 1
      from public.pm_marketer_advertisers ma
      join public.pm_profiles p on p.id = ma.marketer_id
      where ma.advertiser_id = target_advertiser_id
        and ma.marketer_id = auth.uid()
        and ma.permission = 'manage'
        and p.is_active = true
    );
$$;

-- profiles
create policy "profiles_select_self_or_admin"
on public.pm_profiles for select
using (id = auth.uid() or public.pm_is_admin());

create policy "profiles_admin_manage"
on public.pm_profiles for all
using (public.pm_is_admin())
with check (public.pm_is_admin());

-- advertisers
create policy "advertisers_select_assigned_or_admin"
on public.pm_advertisers for select
using (public.pm_can_access_advertiser(id));

create policy "advertisers_admin_manage"
on public.pm_advertisers for all
using (public.pm_is_admin())
with check (public.pm_is_admin());

-- marketer assignments
create policy "assignments_select_self_or_admin"
on public.pm_marketer_advertisers for select
using (marketer_id = auth.uid() or public.pm_is_admin());

create policy "assignments_admin_manage"
on public.pm_marketer_advertisers for all
using (public.pm_is_admin())
with check (public.pm_is_admin());

-- click logs
create policy "click_logs_select_assigned_or_admin"
on public.pm_click_logs for select
using (public.pm_can_access_advertiser(advertiser_id));

create policy "click_logs_service_insert_only"
on public.pm_click_logs for insert
with check (false);

-- blocked ips
create policy "blocked_ips_select_assigned_or_admin"
on public.pm_blocked_ips for select
using (public.pm_can_access_advertiser(advertiser_id));

create policy "blocked_ips_insert_manage_assigned_or_admin"
on public.pm_blocked_ips for insert
with check (public.pm_can_manage_advertiser(advertiser_id));

create policy "blocked_ips_update_manage_assigned_or_admin"
on public.pm_blocked_ips for update
using (public.pm_can_manage_advertiser(advertiser_id))
with check (public.pm_can_manage_advertiser(advertiser_id));

-- reports
create policy "reports_select_assigned_or_admin"
on public.pm_reports for select
using (advertiser_id is null and public.pm_is_admin() or public.pm_can_access_advertiser(advertiser_id));

create policy "reports_admin_manage"
on public.pm_reports for all
using (public.pm_is_admin())
with check (public.pm_is_admin());

-- 중요:
-- service_role key는 절대 클라이언트에 노출하지 말고 서버 API, Edge Function, 배치 작업에서만 사용하세요.
-- 수집 API(/api/collect, /api/events)는 service role 또는 별도 서버 권한으로 insert를 수행하는 것을 권장합니다.
