# 프로그레스미디어 무효클릭차단 솔루션

Next.js 14, React, TailwindCSS, Recharts 기반의 무효클릭차단 솔루션입니다. 현재 1차 상용화 준비 단계로, 운영 모드와 개발 모드를 분리하고 Supabase Auth/DB 연동을 우선하는 구조로 정리했습니다.

## 실행

```bash
npm install
npm run dev
npm run build
```

## 환경 모드

`PM_PROJECT_ENV` 기준으로 동작 모드를 나눕니다.

- `local`, `development`: Supabase 환경변수가 없으면 mock fallback 허용
- `production`, `cloudtype`: Supabase 연결을 우선 사용하며, 연결 설정이 없으면 mock으로 조용히 넘어가지 않고 설정 오류를 표시

클라이언트에는 `next.config.mjs`를 통해 모드 값만 `NEXT_PUBLIC_PM_PROJECT_ENV`로 주입합니다. service role key, IP salt 같은 민감 정보는 클라이언트에 노출하지 않습니다.

## 환경변수

`.env.example`을 기준으로 Cloudtype 또는 로컬 환경변수를 등록합니다.

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_TRACKER_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PM_PROJECT_ENV=local
LOG_RETENTION_DAYS=90
IP_HASH_SALT=change-me
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 API Route에서만 사용합니다.
- `IP_HASH_SALT`는 서버에서 IP hash 생성에만 사용합니다.
- 두 값에는 절대 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.
- `.env.local`은 Git에 포함하지 않습니다.

## Supabase 연결 순서

1. Supabase Auth 활성화
2. `docs/AUTH_RLS_SCHEMA.sql` 기준으로 `pm_profiles`, `pm_advertisers`, `pm_marketer_advertisers`, `pm_advertiser_users` 등 테이블 생성
3. RLS 정책 적용
4. Cloudtype 환경변수 등록
5. `PM_PROJECT_ENV=cloudtype` 설정
6. 마케터 회원가입 및 로그인 테스트
7. 광고주 생성, 광고주 계정 생성, 설치 스크립트 발급 테스트

## 계정 생성 흐름

- 관리자: 일반 화면에서 생성하지 않습니다. 서버 운영자가 Supabase Auth/DB에서 직접 생성하는 마스터 계정입니다.
- 마케터: 로그인 화면에서 직접 가입합니다. `@my-progress.co.kr` 이메일만 허용하며 role은 항상 `marketer`로 저장됩니다.
- 광고주: 로그인 화면에서 직접 가입할 수 없습니다. 마케터가 `/advertisers`의 광고주 관리 화면에서 발급합니다.

신규 마케터는 담당 광고주가 0개여도 대시보드에 접근할 수 있으며, `광고주 생성하기` 버튼을 통해 광고주를 등록할 수 있습니다. 광고주 role만 연결된 광고주가 없을 때 접근 불가 안내를 표시합니다.

## 광고주 관리

`/advertisers` 페이지는 아래 탭을 통합합니다.

- 광고주 목록
- 광고주 생성
- 광고주 계정 관리
- 설치 스크립트

광고주 생성 필수값:

- 광고주명
- 사이트 URL
- 광고주 담당자명
- 광고주 로그인 이메일
- 임시 비밀번호

생성 시 `client_id`, `project_key`를 자동 발급하고 `pm_advertisers`, `pm_marketer_advertisers` 저장 구조를 사용합니다. 광고주 Auth 계정 생성처럼 service role key가 필요한 작업은 클라이언트가 아니라 API Route에서 처리합니다.

## 광고주 생성 플로우

마케터가 광고주 생성 버튼을 클릭하면 `POST /api/advertisers` 서버 API Route가 아래 작업을 처리합니다.

1. 현재 로그인 사용자의 Supabase session 확인
2. `pm_profiles.role`이 `marketer` 또는 `admin`인지 확인
3. `pm_advertisers`에 광고주 생성
4. 현재 로그인 사용자와 `pm_marketer_advertisers` 연결
5. Supabase Auth Admin API로 광고주 이메일 계정 생성
6. `pm_profiles`에 `role='advertiser'` profile upsert
7. `pm_advertiser_users`에 광고주 계정과 `advertiser_id` 연결
8. 모든 단계 성공 시 `client_id`, `project_key`, 설치 스크립트, 광고주 로그인 정보 반환

이미 같은 광고주 이메일의 Auth user가 있으면 기존 사용자를 조회합니다. 기존 role이 `advertiser`이면 profile/link를 보강하고, 기존 role이 `marketer` 또는 `admin`이면 충돌 오류를 반환합니다.

광고주 Auth 계정 생성은 반드시 서버 API Route에서만 처리합니다. `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트 컴포넌트나 브라우저 번들에서 사용하지 않습니다.

### 광고주 role 제약조건 확인

광고주 Auth 계정 발급 전에 운영 Supabase DB의 `pm_profiles.role` check constraint가 `admin`, `marketer`, `advertiser` 3개 role을 모두 허용해야 합니다. 과거 스키마가 남아 있으면 광고주 생성 중 아래 오류가 발생할 수 있습니다.

```text
new row for relation "pm_profiles" violates check constraint "pm_profiles_role_check"
```

해결 SQL:

```sql
alter table public.pm_profiles drop constraint if exists pm_profiles_role_check;
alter table public.pm_profiles add constraint pm_profiles_role_check check (role in ('admin', 'marketer', 'advertiser'));
notify pgrst, 'reload schema';
```

API가 `DB_ROLE_CONSTRAINT_MISMATCH`를 반환하면 위 SQL을 Supabase SQL Editor에 반영한 뒤 광고주 생성을 다시 시도합니다.

## API Route

상용화를 위한 서버 API 뼈대를 추가했습니다.

- `POST /api/advertisers`: 광고주 생성, 마케터 연결, 설치 스크립트 발급 준비
- `POST /api/advertiser-users`: 광고주 Auth 계정 생성과 `pm_advertiser_users` 연결 준비
- `POST /api/collect`: 추적 스크립트 클릭/방문 수집 준비
- `POST /api/events`: 체류시간, 전환 이벤트 수집 준비

운영 모드에서 `SUPABASE_SERVICE_ROLE_KEY`가 없으면 service role이 필요한 API는 503 오류를 반환합니다.

## 추적 스크립트

`public/pm-click-shield.js`는 설치 태그의 `data-client-id`, `data-project-key`를 읽습니다.

예시:

```html
<script src="https://your-app.example.com/pm-click-shield.js" data-client-id="pm-client" data-project-key="pk-project" async></script>
```

동작:

- 최초 페이지 진입 시 `/api/collect`로 방문/클릭 수집 POST
- `pagehide` 또는 `beforeunload` 시 `/api/events`로 체류시간 POST
- UTM 파라미터, referrer, user_agent, page_url, visitor_id, session_id 수집
- fetch 실패 시 콘솔 오류만 남기고 광고주 사이트 동작은 방해하지 않음
- `localStorage`에 visitor id 생성
- `sessionStorage`에 session id 생성

테스트 페이지:

- `/test-advertiser.html`
- 파일 안의 `data-client-id`, `data-project-key`를 실제 광고주 값으로 바꿔 체류시간과 conversion 이벤트를 테스트할 수 있습니다.

## /api/collect 테스트

local/development 모드에서는 Supabase가 없어도 구조화된 mock 응답을 반환합니다. 운영 모드에서는 `pm_advertisers.client_id`, `pm_advertisers.project_key`가 일치해야 저장됩니다.

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/collect" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "pm-client",
    "project_key": "pk-project",
    "visitor_id": "v-test",
    "session_id": "s-test",
    "page_url": "https://advertiser.example/landing",
    "utm_source": "naver",
    "utm_medium": "search",
    "utm_campaign": "brand"
  }'
```

검증:

- 잘못된 `client_id/project_key`: 403
- 정상 `client_id/project_key`: `pm_click_logs` 저장
- 저장 컬럼: `ip_hash`, `ip_masked`, `user_agent`, `page_url`, `referrer`, UTM, `click_status`, `risk_score`, `reason`
- IP 원문은 저장하지 않음

## /api/events

`/api/events`는 체류시간과 전환 이벤트를 수신합니다.

- `event_type=stay_time`: 가장 최근 `visitor_id/session_id` 로그의 `stay_time` 업데이트
- `event_type=conversion`: `pm_conversion_events` 테이블이 있으면 저장

## Supabase 저장 확인

Supabase SQL Editor에서 예시 쿼리:

```sql
select
  advertiser_id,
  client_id,
  visitor_id,
  session_id,
  ip_hash,
  ip_masked,
  page_url,
  click_status,
  risk_score,
  reason,
  created_at
from public.pm_click_logs
order by created_at desc
limit 20;
```

## 실제 클릭 로그 기반 대시보드

운영 모드(`PM_PROJECT_ENV=production` 또는 `cloudtype`)에서는 대시보드, 실시간 클릭 로그, 무효클릭 분석, 차단 관리, 광고주 리포트가 `pm_click_logs`에 저장된 실제 로그를 기준으로 계산됩니다. Supabase 연결 실패 시 mock 데이터로 조용히 전환하지 않고 화면 상단에 조회 오류를 표시합니다. local/development 모드에서만 더미 클릭 데이터를 사용할 수 있습니다.

role별 조회 범위:

- `admin`: 전체 광고주와 전체 `pm_click_logs` 조회
- `marketer`: `pm_marketer_advertisers`에 연결된 광고주의 로그만 조회
- `advertiser`: `pm_advertiser_users`에 연결된 본인 광고주의 로그만 조회

대시보드 KPI는 `click_status` 값을 기준으로 계산합니다.

- `normal`: 정상 클릭
- `suspicious`: 의심 클릭
- `blocked`: 차단 클릭

`pm_click_logs` 필수 운영 컬럼:

```sql
advertiser_id uuid,
client_id text,
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
stay_time integer,
page_count integer,
click_status text,
risk_score integer,
reason text,
cpc numeric,
created_at timestamp with time zone
```

운영 로그 확인 SQL:

```sql
select
  l.created_at,
  a.name as advertiser_name,
  l.client_id,
  l.ip_masked,
  l.page_url,
  l.referrer,
  l.utm_source,
  l.utm_medium,
  l.utm_campaign,
  l.click_status,
  l.risk_score,
  l.reason
from public.pm_click_logs l
left join public.pm_advertisers a on a.id = l.advertiser_id
order by l.created_at desc
limit 50;
```

IP 정책:

- 화면과 CSV에는 `ip_masked`만 표시합니다.
- `ip_hash`는 반복 클릭 집계와 `pm_blocked_ips` 저장 기준으로만 사용합니다.
- IP 원문은 저장하거나 화면에 노출하지 않습니다.

광고주 생성 후 확인 SQL:

```sql
select id, name, client_id, project_key, site_url, created_by, created_at
from public.pm_advertisers
order by created_at desc
limit 10;

select ma.marketer_id, p.email as marketer_email, ma.advertiser_id, a.name as advertiser_name
from public.pm_marketer_advertisers ma
join public.pm_profiles p on p.id = ma.marketer_id
join public.pm_advertisers a on a.id = ma.advertiser_id
order by ma.assigned_at desc
limit 10;

select id, email, name, role, team, is_active
from public.pm_profiles
where role = 'advertiser'
order by created_at desc
limit 10;

select au.user_id, p.email, au.advertiser_id, a.name, au.permission
from public.pm_advertiser_users au
join public.pm_profiles p on p.id = au.user_id
join public.pm_advertisers a on a.id = au.advertiser_id
order by au.created_at desc
limit 10;
```

광고주 로그인 QA:

1. 마케터로 로그인
2. `/advertisers`에서 광고주명, 사이트 URL, 담당자명, 광고주 이메일, 임시 비밀번호 입력
3. 광고주 생성 클릭
4. Supabase Auth Users에 광고주 이메일 생성 확인
5. 위 SQL로 `pm_advertisers`, `pm_marketer_advertisers`, `pm_profiles`, `pm_advertiser_users` 확인
6. 로그아웃 후 광고주 이메일/임시 비밀번호로 로그인
7. 광고주 계정에서 본인 광고주만 보이는지 확인
8. 설치 스크립트의 `data-client-id`, `data-project-key`가 DB 값과 일치하는지 확인

## 개인정보/로그 정책

- IP 원문 저장을 최소화합니다.
- API Route는 `ip_hash`, `ip_masked` 필드 기준으로 저장하도록 설계했습니다.
- `IP_HASH_SALT`는 서버 환경변수로만 사용합니다.
- 기본 로그 보관기간은 `LOG_RETENTION_DAYS=90` 기준입니다.
- 광고주별 데이터는 RLS와 `advertiser_id` 기준으로 분리해야 합니다.

## 무효클릭 서버 판정 기준

`/api/collect`는 저장 전 Supabase 데이터를 기준으로 초기 판정을 수행합니다.

- 동일 `advertiser_id + ip_hash` 최근 10분 내 3회 이상: `suspicious`
- 동일 `advertiser_id + ip_hash` 최근 10분 내 5회 이상: `blocked`
- `stay_time` 3초 이하: 위험도 가중
- `page_count` 0회: 위험도 가중
- `pm_blocked_ips`에 등록된 `ip_hash`: `blocked`

DB 조회 실패 시 과차단을 피하기 위해 안전하게 `normal` 또는 `suspicious`로 처리하고 reason에 실패 사유를 남깁니다.

## 화면 라우트

- `/`: 로그인
- `/dashboard`: 대시보드
- `/advertisers`: 광고주 관리
- `/logs`: 실시간 클릭 로그
- `/analysis`: 무효클릭 분석
- `/blocks`: 차단 관리
- `/reports`: 광고주 리포트
- `/account`: 내 계정

## 주요 파일

```text
app/api/advertisers/route.js
app/api/advertiser-users/route.js
app/api/collect/route.js
app/api/events/route.js
public/pm-click-shield.js
lib/envMode.js
lib/supabaseClient.js
lib/serverSupabase.js
lib/privacy.js
services/clickService.js
components/AdvertiserCreatePanel.jsx
components/AdvertiserUserManagement.jsx
```

## 보안 메모

- 실제 Supabase 키는 코드에 넣지 않습니다.
- service role key는 클라이언트 컴포넌트와 클라이언트 서비스에서 사용하지 않습니다.
- 운영 모드에서 Supabase 설정 오류가 있으면 mock fallback으로 숨기지 않고 명확한 오류를 표시합니다.
