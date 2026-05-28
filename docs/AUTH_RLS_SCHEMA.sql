-- ProgressMedia Supabase Auth + RLS schema draft
-- service_role key는 절대 클라이언트에 노출하지 말고 서버 API에서만 사용하세요.

create table if not exists public.pm_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  role text not null default 'advertiser' check (role in ('admin', 'marketer', 'advertiser')),
  team text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.pm_advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id text not null unique,
  site_url text,
  project_key text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.pm_profiles(id),
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

create table if not exists public.pm_advertiser_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.pm_profiles(id) on delete cascade,
  advertiser_id uuid not null references public.pm_advertisers(id) on delete cascade,
  permission text not null default 'view' check (permission in ('manage', 'view')),
  created_by uuid references public.pm_profiles(id),
  created_at timestamp with time zone not null default now(),
  unique (user_id, advertiser_id)
);

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
  client_id text,
  ip_hash text not null,
  ip_masked text,
  reason text,
  block_type text not null default 'manual',
  source text not null default 'dashboard',
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now(),
  released_at timestamp with time zone
);

create table if not exists public.pm_block_rules (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references public.pm_advertisers(id) on delete cascade,
  rule_key text not null,
  rule_name text not null,
  description text,
  action text not null default 'monitor',
  threshold integer,
  risk_delta integer not null default 0,
  is_enabled boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (advertiser_id, rule_key)
);

create table if not exists public.pm_reports (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references public.pm_advertisers(id) on delete cascade,
  report_date date not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_pm_profiles_role on public.pm_profiles(role);
create index if not exists idx_pm_advertisers_created_by on public.pm_advertisers(created_by);
create index if not exists idx_pm_marketer_advertisers_marketer on public.pm_marketer_advertisers(marketer_id);
create index if not exists idx_pm_marketer_advertisers_advertiser on public.pm_marketer_advertisers(advertiser_id);
create index if not exists idx_pm_advertiser_users_user on public.pm_advertiser_users(user_id);
create index if not exists idx_pm_advertiser_users_advertiser on public.pm_advertiser_users(advertiser_id);
create index if not exists idx_pm_click_logs_advertiser_time on public.pm_click_logs(advertiser_id, occurred_at desc);
create index if not exists idx_pm_blocked_ips_advertiser on public.pm_blocked_ips(advertiser_id);
create index if not exists idx_pm_block_rules_advertiser on public.pm_block_rules(advertiser_id);
create index if not exists idx_pm_block_rules_key on public.pm_block_rules(rule_key);
create index if not exists idx_pm_reports_advertiser_date on public.pm_reports(advertiser_id, report_date desc);

-- Existing production DBs may still have an older role constraint that only allows admin/marketer.
-- Apply this block before issuing advertiser login accounts.
alter table public.pm_profiles drop constraint if exists pm_profiles_role_check;
alter table public.pm_profiles add constraint pm_profiles_role_check check (role in ('admin', 'marketer', 'advertiser'));
notify pgrst, 'reload schema';

-- Production tracking columns
alter table public.pm_advertisers add column if not exists site_url text;
alter table public.pm_advertisers add column if not exists project_key text;
alter table public.pm_advertisers add column if not exists created_by uuid references public.pm_profiles(id);

alter table public.pm_click_logs add column if not exists client_id text;
alter table public.pm_click_logs add column if not exists visitor_id text;
alter table public.pm_click_logs add column if not exists session_id text;
alter table public.pm_click_logs add column if not exists user_agent text;
alter table public.pm_click_logs add column if not exists page_url text;
alter table public.pm_click_logs add column if not exists referrer text;
alter table public.pm_click_logs add column if not exists utm_source text;
alter table public.pm_click_logs add column if not exists utm_medium text;
alter table public.pm_click_logs add column if not exists utm_campaign text;
alter table public.pm_click_logs add column if not exists utm_term text;
alter table public.pm_click_logs add column if not exists utm_content text;
alter table public.pm_click_logs add column if not exists stay_time integer;
alter table public.pm_click_logs add column if not exists page_count integer;
alter table public.pm_click_logs add column if not exists click_status text check (click_status in ('normal', 'suspicious', 'blocked'));
alter table public.pm_click_logs add column if not exists recent_count integer;
alter table public.pm_click_logs add column if not exists applied_rules jsonb not null default '[]'::jsonb;
alter table public.pm_click_logs add column if not exists cpc numeric not null default 0;
alter table public.pm_click_logs add column if not exists created_at timestamp with time zone not null default now();

create index if not exists idx_pm_click_logs_advertiser_created_at on public.pm_click_logs(advertiser_id, created_at desc);
create index if not exists idx_pm_click_logs_ip_hash_created_at on public.pm_click_logs(ip_hash, created_at desc);
create index if not exists idx_pm_click_logs_client_created_at on public.pm_click_logs(client_id, created_at desc);
create index if not exists idx_pm_blocked_ips_advertiser_ip_hash on public.pm_blocked_ips(advertiser_id, ip_hash);
alter table public.pm_blocked_ips add column if not exists client_id text;
alter table public.pm_blocked_ips add column if not exists block_type text not null default 'manual';
alter table public.pm_blocked_ips add column if not exists source text not null default 'dashboard';
alter table public.pm_blocked_ips add column if not exists is_active boolean not null default true;
alter table public.pm_blocked_ips add column if not exists created_at timestamp with time zone not null default now();
alter table public.pm_blocked_ips add column if not exists released_at timestamp with time zone;
alter table public.pm_blocked_ips add column if not exists release_reason text;
alter table public.pm_blocked_ips add column if not exists created_by uuid references auth.users(id);
create unique index if not exists uniq_pm_blocked_ips_active on public.pm_blocked_ips(advertiser_id, ip_hash) where is_active = true;
create index if not exists idx_pm_blocked_ips_client_created_at on public.pm_blocked_ips(client_id, created_at desc);
create index if not exists idx_pm_blocked_ips_is_active on public.pm_blocked_ips(is_active);

create table if not exists public.pm_block_rules (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references public.pm_advertisers(id) on delete cascade,
  rule_key text not null,
  rule_name text not null,
  description text,
  action text not null default 'monitor',
  threshold integer,
  risk_delta integer not null default 0,
  is_enabled boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (advertiser_id, rule_key)
);

alter table public.pm_block_rules add column if not exists advertiser_id uuid references public.pm_advertisers(id) on delete cascade;
alter table public.pm_block_rules add column if not exists rule_key text;
alter table public.pm_block_rules add column if not exists rule_name text;
alter table public.pm_block_rules add column if not exists description text;
alter table public.pm_block_rules add column if not exists action text not null default 'monitor';
alter table public.pm_block_rules add column if not exists threshold integer;
alter table public.pm_block_rules add column if not exists risk_delta integer not null default 0;
alter table public.pm_block_rules add column if not exists is_enabled boolean not null default true;
alter table public.pm_block_rules add column if not exists created_by uuid references auth.users(id);
alter table public.pm_block_rules add column if not exists created_at timestamp with time zone not null default now();
alter table public.pm_block_rules add column if not exists updated_at timestamp with time zone not null default now();
create unique index if not exists uniq_pm_block_rules_advertiser_key on public.pm_block_rules(advertiser_id, rule_key);
create index if not exists idx_pm_block_rules_advertiser_key on public.pm_block_rules(advertiser_id, rule_key);
create index if not exists idx_pm_block_rules_enabled on public.pm_block_rules(is_enabled);

insert into public.pm_block_rules (advertiser_id, rule_key, rule_name, description, action, threshold, risk_delta, is_enabled)
select a.id, rule.rule_key, rule.rule_name, rule.description, rule.action, rule.threshold, rule.risk_delta, rule.is_enabled
from public.pm_advertisers a
cross join (
  values
    ('repeat_click_suspicious', '반복 클릭 의심', '같은 광고주와 IP 기준 10분 내 3회 이상 클릭 시 의심으로 판정합니다.', 'suspicious', 3, 0, true),
    ('repeat_click_block', '반복 클릭 차단', '같은 광고주와 IP 기준 10분 내 5회 이상 클릭 시 차단으로 판정합니다.', 'blocked', 5, 0, true),
    ('short_stay', '짧은 체류', '체류시간이 3초 이하이면 위험도를 가중합니다.', 'monitor', 3, 12, true),
    ('no_page_move', '무이동 세션', '페이지 이동이 0회이면 위험도를 가중합니다.', 'monitor', 0, 10, true),
    ('partner_media_watch', '제휴 매체 관찰', '제휴 매체 유입을 관찰 reason에 추가합니다.', 'monitor', null, 0, false)
) as rule(rule_key, rule_name, description, action, threshold, risk_delta, is_enabled)
on conflict (advertiser_id, rule_key) do nothing;

create table if not exists public.pm_conversion_events (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.pm_advertisers(id) on delete cascade,
  client_id text,
  project_key text,
  visitor_id text,
  session_id text,
  ip_hash text,
  ip_masked text,
  user_agent text,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  event_name text,
  event_type text not null default 'conversion',
  value numeric,
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  conversion_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.pm_conversion_events add column if not exists advertiser_id uuid references public.pm_advertisers(id) on delete cascade;
alter table public.pm_conversion_events add column if not exists client_id text;
alter table public.pm_conversion_events add column if not exists project_key text;
alter table public.pm_conversion_events add column if not exists visitor_id text;
alter table public.pm_conversion_events add column if not exists session_id text;
alter table public.pm_conversion_events add column if not exists ip_hash text;
alter table public.pm_conversion_events add column if not exists ip_masked text;
alter table public.pm_conversion_events add column if not exists user_agent text;
alter table public.pm_conversion_events add column if not exists page_url text;
alter table public.pm_conversion_events add column if not exists referrer text;
alter table public.pm_conversion_events add column if not exists utm_source text;
alter table public.pm_conversion_events add column if not exists utm_medium text;
alter table public.pm_conversion_events add column if not exists utm_campaign text;
alter table public.pm_conversion_events add column if not exists utm_term text;
alter table public.pm_conversion_events add column if not exists utm_content text;
alter table public.pm_conversion_events add column if not exists event_name text;
alter table public.pm_conversion_events add column if not exists event_type text not null default 'conversion';
alter table public.pm_conversion_events add column if not exists value numeric;
alter table public.pm_conversion_events add column if not exists currency text;
alter table public.pm_conversion_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.pm_conversion_events add column if not exists conversion_data jsonb not null default '{}'::jsonb;
alter table public.pm_conversion_events add column if not exists created_at timestamp with time zone not null default now();

create index if not exists idx_pm_conversion_events_advertiser_created_at on public.pm_conversion_events(advertiser_id, created_at desc);
create index if not exists idx_pm_conversion_events_client_created_at on public.pm_conversion_events(client_id, created_at desc);

alter table public.pm_conversion_events enable row level security;

alter table public.pm_profiles enable row level security;
alter table public.pm_advertisers enable row level security;
alter table public.pm_marketer_advertisers enable row level security;
alter table public.pm_advertiser_users enable row level security;
alter table public.pm_click_logs enable row level security;
alter table public.pm_blocked_ips enable row level security;
alter table public.pm_block_rules enable row level security;
alter table public.pm_reports enable row level security;

create or replace function public.pm_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pm_profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.pm_is_marketer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pm_profiles
    where id = auth.uid() and role = 'marketer' and is_active = true
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
        and p.role = 'marketer'
        and p.is_active = true
    )
    or exists (
      select 1
      from public.pm_advertiser_users au
      join public.pm_profiles p on p.id = au.user_id
      where au.advertiser_id = target_advertiser_id
        and au.user_id = auth.uid()
        and p.role = 'advertiser'
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
        and p.role = 'marketer'
        and p.is_active = true
    );
$$;

-- profiles
create policy "profiles_select_self_or_admin"
on public.pm_profiles for select
using (
  id = auth.uid()
  or public.pm_is_admin()
  or exists (
    select 1
    from public.pm_advertiser_users au
    where au.user_id = pm_profiles.id
      and public.pm_can_manage_advertiser(au.advertiser_id)
  )
);

create policy "profiles_admin_manage"
on public.pm_profiles for all
using (public.pm_is_admin())
with check (public.pm_is_admin());

-- advertisers
create policy "advertisers_select_accessible"
on public.pm_advertisers for select
using (public.pm_can_access_advertiser(id));

create policy "advertisers_admin_or_marketer_insert"
on public.pm_advertisers for insert
with check (public.pm_is_admin() or public.pm_is_marketer());

create policy "advertisers_update_manager"
on public.pm_advertisers for update
using (public.pm_can_manage_advertiser(id))
with check (public.pm_can_manage_advertiser(id));

-- marketer assignments
create policy "marketer_assignments_select_related"
on public.pm_marketer_advertisers for select
using (
  public.pm_is_admin()
  or marketer_id = auth.uid()
  or public.pm_can_access_advertiser(advertiser_id)
);

create policy "marketer_assignments_admin_manage"
on public.pm_marketer_advertisers for all
using (public.pm_is_admin())
with check (public.pm_is_admin());

-- advertiser users
create policy "advertiser_users_select_related"
on public.pm_advertiser_users for select
using (
  public.pm_is_admin()
  or user_id = auth.uid()
  or public.pm_can_manage_advertiser(advertiser_id)
);

create policy "advertiser_users_insert_by_manager"
on public.pm_advertiser_users for insert
with check (public.pm_can_manage_advertiser(advertiser_id));

create policy "advertiser_users_update_by_manager"
on public.pm_advertiser_users for update
using (public.pm_can_manage_advertiser(advertiser_id))
with check (public.pm_can_manage_advertiser(advertiser_id));

-- click logs
create policy "click_logs_select_accessible"
on public.pm_click_logs for select
using (public.pm_can_access_advertiser(advertiser_id));

notify pgrst, 'reload schema';

create policy "click_logs_service_insert_only"
on public.pm_click_logs for insert
with check (false);

-- blocked ips
create policy "blocked_ips_select_accessible"
on public.pm_blocked_ips for select
using (public.pm_can_access_advertiser(advertiser_id));

create policy "blocked_ips_insert_manager"
on public.pm_blocked_ips for insert
with check (public.pm_can_manage_advertiser(advertiser_id));

create policy "blocked_ips_update_manager"
on public.pm_blocked_ips for update
using (public.pm_can_manage_advertiser(advertiser_id))
with check (public.pm_can_manage_advertiser(advertiser_id));

create policy "block_rules_select_accessible"
on public.pm_block_rules for select
using (public.pm_can_access_advertiser(advertiser_id));

create policy "block_rules_insert_manager"
on public.pm_block_rules for insert
with check (public.pm_can_manage_advertiser(advertiser_id));

create policy "block_rules_update_manager"
on public.pm_block_rules for update
using (public.pm_can_manage_advertiser(advertiser_id))
with check (public.pm_can_manage_advertiser(advertiser_id));

-- reports
create policy "reports_select_accessible"
on public.pm_reports for select
using (public.pm_can_access_advertiser(advertiser_id));

create policy "reports_admin_manage"
on public.pm_reports for all
using (public.pm_is_admin())
with check (public.pm_is_admin());

create policy "conversion_events_select_accessible"
on public.pm_conversion_events for select
using (public.pm_can_access_advertiser(advertiser_id));

-- 운영 메모
-- 1. 광고주 Auth 사용자 생성은 Supabase Admin API가 필요하므로 서버 API에서 service role key로 처리하세요.
-- 2. collect/events API의 insert도 서버 API 또는 Edge Function에서 service role key로 처리하세요.
-- 3. 클라이언트에는 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY만 노출하세요.

notify pgrst, 'reload schema';
