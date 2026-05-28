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
- Cloudtype 운영 환경에는 `IP_HASH_SALT`가 반드시 필요합니다.
- 두 값에는 절대 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.
- 특히 `IP_HASH_SALT`에는 `NEXT_PUBLIC_` 접두어를 붙이면 안 됩니다.
- `.env.local`은 Git에 포함하지 않습니다.

## Supabase 연결 순서

1. Supabase Auth 활성화
2. `docs/AUTH_RLS_SCHEMA.sql` 기준으로 `pm_profiles`, `pm_advertisers`, `pm_marketer_advertisers`, `pm_advertiser_users` 등 테이블 생성
3. RLS 정책 적용
4. Cloudtype 환경변수 등록
5. `PM_PROJECT_ENV=cloudtype` 설정
6. 마케터 회원가입 및 로그인 테스트
7. 광고주/사이트 등록, 광고주 로그인 계정 발급, 설치 스크립트 발급 테스트

## 계정 생성 흐름

- 관리자: 일반 화면에서 생성하지 않습니다. 서버 운영자가 Supabase Auth/DB에서 직접 생성하는 마스터 계정입니다.
- 마케터: 로그인 화면에서 직접 가입합니다. `@my-progress.co.kr` 이메일만 허용하며 role은 항상 `marketer`로 저장됩니다.
- 광고주: 로그인 화면에서 직접 가입할 수 없습니다. 마케터가 `/advertisers`의 광고주 관리 화면에서 발급합니다.

신규 마케터는 담당 광고주가 0개여도 대시보드에 접근할 수 있으며, `광고주 생성하기` 버튼을 통해 광고주를 등록할 수 있습니다. 광고주 role만 연결된 광고주가 없을 때 접근 불가 안내를 표시합니다.

## 광고주 관리

`/advertisers` 페이지는 광고주 운영 흐름을 3단계로 분리합니다.

- 광고주 목록
- 광고주/사이트 등록
- 광고주 로그인 계정 발급
- 설치 스크립트

광고주/사이트 등록 필수값:

- 광고주명
- 사이트 URL
- 상태 `active/inactive`

광고주/사이트 등록 시 `client_id`, `project_key`를 자동 발급하고 `pm_advertisers`, `pm_marketer_advertisers` 저장 구조를 사용합니다. 이 단계에서는 Supabase Auth 광고주 로그인 계정을 만들지 않습니다.

광고주 로그인 계정 발급 필수값:

- 광고주 선택
- 담당자명
- 로그인 이메일
- 임시 비밀번호
- 권한 `view/manage`
- 상태 `active`

광고주 Auth 계정 생성처럼 service role key가 필요한 작업은 클라이언트가 아니라 `POST /api/advertiser-users` 서버 API Route에서 처리합니다. `@my-progress.co.kr`은 내부 마케터 계정용이므로 광고주 로그인 이메일에는 사용하지 않습니다.

광고주 목록에서는 광고주별 로그인 계정 수를 표시합니다. 계정 수가 0이면 `계정 미발급` 배지를 표시하고, `계정 발급` 버튼으로 해당 광고주가 선택된 계정 발급 탭으로 이동합니다.

## 상용 서비스형 메뉴 구조

좌측 사이드바는 분석 솔루션형 IA에 맞춰 그룹형 메뉴로 구성했습니다. 스마트로그류 서비스의 정보 구조에서 "분석 관점 분리"만 참고했으며, 프로그레스미디어 고유의 다크톤 UI와 민트 brand color를 유지합니다.

- 메인: 대시보드
- 방문자 분석: 실시간 방문자, 방문자 로그, 페이지별 유입
- 부정클릭 분석: 광고 클릭 IP, 의심 클릭 IP, 차단된 IP, 반복 클릭 IP, 노출제한 IP
- 차단 관리: 자동 차단 규칙, 수동 차단 IP, 차단 해제 이력
- 전환 분석: 전환 이벤트, 전환 로그, 광고비 절감 추정
- 로그 분석: 전체 로그, Referrer URL, UTM 분석, 검색어/키워드
- 광고주 관리: 광고주 목록, 광고주/사이트 등록, 광고주 로그인 계정 발급, 설치 스크립트
- 리포트: 광고주 리포트, CSV 내보내기, 인쇄용 리포트
- 설정: 내 계정, 운영 정책

주요 route:

```text
/dashboard
/visitors/realtime
/visitors/logs
/visitors/pages
/invalid-clicks/ad-click-ip
/invalid-clicks/suspicious-ip
/invalid-clicks/blocked-ip
/invalid-clicks/repeated-ip
/invalid-clicks/exposure-limited-ip
/blocks/rules
/blocks/manual
/blocks/history
/conversions/events
/conversions/logs
/conversions/savings
/logs/all
/logs/referrers
/logs/utm
/logs/keywords
/advertisers
/advertisers/create
/advertisers/accounts
/advertisers/scripts
/reports/advertisers
/reports/export
/reports/print
/settings/account
/settings/policy
```

role별 메뉴 접근:

- `admin`: 전체 메뉴 접근 가능
- `marketer`: 대시보드, 방문자 분석, 부정클릭 분석, 차단 관리, 전환 분석, 로그 분석, 광고주 관리, 리포트, 내 계정 접근 가능
- `advertiser`: 대시보드, 실시간 방문자, 방문자 로그, 광고 클릭 IP, 의심 클릭 IP, 차단된 IP, 전환 이벤트, 광고주 리포트, 내 계정만 접근 가능

광고주 role은 광고주/사이트 등록, 광고주 로그인 계정 발급, 운영 정책, 다른 광고주 관리 기능을 볼 수 없습니다.

메뉴별 주요 데이터 테이블:

- 방문자 분석, 부정클릭 분석, 로그 분석: `pm_click_logs`
- 차단 관리: `pm_blocked_ips`, `pm_click_logs`
- 전환 분석: `pm_conversion_events`, `pm_click_logs`
- 광고주 관리: `pm_advertisers`, `pm_marketer_advertisers`, `pm_advertiser_users`
- 리포트: `pm_click_logs`, `pm_blocked_ips`, `pm_conversion_events`

## 광고주/사이트 등록 플로우

마케터가 광고주/사이트 등록 버튼을 클릭하면 `POST /api/advertisers` 서버 API Route가 아래 작업을 처리합니다.

1. 현재 로그인 사용자의 Supabase session 확인
2. `pm_profiles.role`이 `marketer` 또는 `admin`인지 확인
3. `pm_advertisers`에 광고주 생성
4. 현재 로그인 사용자와 `pm_marketer_advertisers` 연결
5. `client_id`, `project_key`, 설치 스크립트 반환

이 단계는 광고주 데이터와 추적 키를 만드는 단계입니다. 광고주 로그인 계정은 별도의 `광고주 로그인 계정 발급` 탭에서 생성합니다.

## 광고주 로그인 계정 발급 플로우

마케터가 광고주 로그인 계정 발급 버튼을 클릭하면 `POST /api/advertiser-users` 서버 API Route가 아래 작업을 처리합니다.

1. 현재 로그인 사용자의 Supabase session 확인
2. `pm_profiles.role`이 `marketer` 또는 `admin`인지 확인
3. 선택한 광고주가 현재 마케터 담당 광고주인지 확인
4. Supabase Auth Admin API로 광고주 이메일 계정 생성 또는 기존 advertiser 계정 확인
5. `pm_profiles`에 `role='advertiser'` profile upsert
6. `pm_advertiser_users`에 광고주 계정과 `advertiser_id` 연결
7. 발급된 광고주명, 로그인 이메일, 권한, 상태를 반환

이미 같은 광고주 이메일의 Auth user가 있으면 기존 사용자를 조회합니다. 기존 role이 `advertiser`이면 profile/link를 보강하고, 기존 role이 `marketer` 또는 `admin`이면 충돌 오류를 반환합니다. 광고주 직접 가입 화면은 제공하지 않습니다.

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

- `POST /api/advertisers`: 광고주/사이트 등록, 마케터 연결, 추적 키와 설치 스크립트 발급
- `POST /api/advertiser-users`: 광고주 Auth 계정 생성과 `pm_advertiser_users` 연결
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

## 광고주 홈페이지 설치 절차

1. `/advertisers`의 설치 스크립트 탭에서 광고주별 `client_id`, `project_key`가 포함된 코드를 복사합니다.
2. 일반 HTML 사이트는 `</body>` 바로 위에 삽입합니다.
3. 카페24, 아임웹, 워드프레스 같은 CMS는 공통 하단 스크립트 또는 Footer Script 영역에 삽입합니다.
4. 전체 사이트 적용 전 테스트 페이지 1개에 먼저 삽입합니다.
5. 사이트 화면이 깨지지 않는지 확인한 뒤 UTM 테스트 URL로 접속합니다.
6. Supabase `pm_click_logs` 저장 여부와 대시보드 실시간 클릭 로그 노출 여부를 확인합니다.

설치 코드 예시:

```html
<script
  async
  src="https://your-cloudtype-domain.example/pm-click-shield.js"
  data-client-id="광고주 client_id"
  data-project-key="광고주 project_key">
</script>
```

UTM 테스트 URL 예시:

```text
https://advertiser.example/test-page?utm_source=naver&utm_medium=cpc&utm_campaign=test_campaign&utm_term=invalid-click-test
```

스크립트 제거 방법:

- 광고주 사이트의 공통 Footer Script 또는 HTML에 삽입한 `<script src=".../pm-click-shield.js">` 태그를 삭제합니다.
- CMS 캐시가 있으면 캐시를 비우고 테스트 페이지에서 네트워크 요청이 더 이상 발생하지 않는지 확인합니다.

개인정보/위탁 고지:

- 스크립트는 방문 식별을 위해 `localStorage`, `sessionStorage`를 사용합니다.
- IP 원문은 저장하지 않고 서버에서 `ip_hash`, `ip_masked`만 저장합니다.
- 광고주 개인정보처리방침 또는 광고/분석 도구 위탁 고지에 로그 수집 목적, 보관 기간, 수집 항목을 반영해야 합니다.

테스트 페이지:

- `/test-advertiser.html`
- 화면에서 `client_id`, `project_key`를 입력하고 `/api/collect`, `/api/events`, conversion 이벤트를 수동 테스트할 수 있습니다.
- Cloudtype 배포 URL 기준으로 `https://배포도메인/test-advertiser.html`에 접속해 본 서버 수집 흐름을 확인합니다.

## 본 서버 QA 성공 결과

Cloudtype 본 서버 기준으로 아래 QA가 성공했습니다.

- `/api/collect` 수동 테스트 성공
- `/api/events` `stay_time` 체류시간 업데이트 성공
- `/api/events` `conversion` 이벤트 저장 성공
- Supabase `pm_click_logs` 저장 정상
- Supabase `pm_conversion_events` 저장 정상
- IP 원문은 저장하지 않고 `ip_hash`, `ip_masked` 구조 사용 확인

필수 운영 환경변수:

```env
NEXT_PUBLIC_APP_URL=https://배포도메인
NEXT_PUBLIC_TRACKER_URL=https://배포도메인/pm-click-shield.js
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PM_PROJECT_ENV=cloudtype
LOG_RETENTION_DAYS=90
IP_HASH_SALT=change-me
```

`SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SALT`는 서버 전용이며, `NEXT_PUBLIC_` 접두어를 붙이지 않습니다. `.env.local`은 Git에 포함하지 않습니다.

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
- `event_type=conversion`: `pm_conversion_events`에 저장
- conversion 저장 시 테이블 또는 컬럼이 누락되어 있으면 `DB_SCHEMA_MISMATCH`를 반환합니다.

## Supabase 저장 확인

Supabase SQL Editor에서 예시 쿼리:

광고주별 발급 키 확인:

```sql
select id, name, client_id, project_key, site_url, status, created_at
from public.pm_advertisers
order by created_at desc
limit 20;
```

최근 수집 로그 확인:

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

특정 `client_id` 기준 로그 확인:

```sql
select
  created_at,
  client_id,
  ip_masked,
  page_url,
  referrer,
  utm_source,
  utm_medium,
  utm_campaign,
  click_status,
  risk_score,
  reason
from public.pm_click_logs
where client_id = '광고주 client_id'
order by created_at desc
limit 50;
```

전환 이벤트 저장 확인:

```sql
select
  created_at,
  advertiser_id,
  client_id,
  project_key,
  visitor_id,
  session_id,
  ip_masked,
  page_url,
  referrer,
  utm_source,
  utm_medium,
  utm_campaign,
  event_name,
  event_type,
  value,
  currency,
  conversion_data,
  metadata
from public.pm_conversion_events
order by created_at desc
limit 50;
```

특정 `client_id` 기준 전환 이벤트 확인:

```sql
select created_at, client_id, event_name, event_type, page_url, ip_masked, conversion_data
from public.pm_conversion_events
where client_id = '광고주 client_id'
order by created_at desc
limit 50;
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

## 반복 클릭 자동 판정과 차단 관리

`/api/collect`는 Supabase `pm_click_logs`, `pm_blocked_ips`를 기준으로 서버에서 무효클릭을 판정합니다.

- 동일 `advertiser_id + ip_hash` 기준 최근 10분 내 3회 이상 클릭: `suspicious`
- 동일 `advertiser_id + ip_hash` 기준 최근 10분 내 5회 이상 클릭: `blocked`
- `pm_blocked_ips`에 활성 등록된 `ip_hash`: 즉시 `blocked`
- `stay_time <= 3`: 위험도 가중
- `page_count = 0`: 위험도 가중
- IP 원문은 저장하지 않고 `ip_hash`, `ip_masked`만 사용

`pm_blocked_ips` 주요 컬럼:

```sql
id uuid primary key default gen_random_uuid(),
advertiser_id uuid references public.pm_advertisers(id) on delete cascade,
client_id text,
ip_hash text not null,
ip_masked text,
reason text,
block_type text default 'manual',
source text default 'dashboard',
is_active boolean default true,
created_by uuid references auth.users(id),
created_at timestamptz default now(),
released_at timestamptz
```

수동 차단 흐름:

1. 차단 관리 화면에서 의심/차단 후보 로그의 `ip_masked`, `ip_hash`를 선택합니다.
2. 광고주와 차단 사유를 확인하고 수동 차단을 등록합니다.
3. 서버 API Route가 role별 접근 권한을 확인한 뒤 `pm_blocked_ips`에 저장합니다.
4. 이후 같은 광고주의 동일 `ip_hash`는 `/api/collect`에서 즉시 `blocked`로 저장됩니다.
5. 차단 해제는 `is_active=false`, `released_at=now()`로 처리합니다.

차단 관리 화면은 실제 `pm_blocked_ips`와 `pm_click_logs`만 사용합니다. 기존 브라우저 상태값 기반 mock 차단 IP와 샘플 차단 목록은 제거되었습니다. 수동 차단은 IP 원문이 아니라 `ip_hash` 기준으로 동작하므로, 운영에서는 직접 IP를 입력하기보다 수집 로그 후보에서 선택해 차단하는 방식을 권장합니다.

차단 확인 SQL:

```sql
select id, advertiser_id, client_id, ip_masked, reason, block_type, source, is_active, created_at, released_at
from public.pm_blocked_ips
order by created_at desc
limit 50;
```

반복 클릭 QA:

1. 동일 `client_id/project_key`로 `/api/collect`를 3회 호출하면 `suspicious`가 반환되는지 확인합니다.
2. 동일 조건으로 5회 호출하면 `blocked`가 반환되는지 확인합니다.
3. `pm_blocked_ips`에 수동 차단 등록 후 같은 `ip_hash`의 `/api/collect`가 즉시 `blocked` 처리되는지 확인합니다.
4. 차단 관리 화면에서 활성 차단 목록, 의심 후보 로그, 차단 후보 로그가 role 범위 내에서만 보이는지 확인합니다.

## 자동 차단 규칙과 수동 차단

자동 차단 규칙은 `pm_block_rules`에 저장됩니다. 차단 관리의 ON/OFF 토글과 threshold 변경은 `PATCH /api/block-rules`를 통해 DB에 반영되며, `/api/collect`의 서버 판정에서 즉시 사용합니다.

기본 규칙:

- `repeat_click_suspicious`: 10분 내 3회 이상이면 `suspicious`
- `repeat_click_block`: 10분 내 5회 이상이면 `blocked`
- `short_stay`: 체류시간 3초 이하이면 위험도 가중
- `no_page_move`: 페이지 이동 0회이면 위험도 가중
- `partner_media_watch`: 제휴 매체 유입 관찰, 기본 OFF

규칙을 OFF로 변경하면 해당 조건은 판정에서 제외됩니다. 단, `pm_blocked_ips`에 활성 등록된 IP hash는 규칙 토글과 무관하게 항상 `blocked` 처리합니다.

수동 차단은 `pm_blocked_ips`에 저장됩니다.

- 로그 기반 차단: 후보 로그의 `log_id`를 서버로 보내고, 서버가 `pm_click_logs.ip_hash`, `ip_masked`를 사용해 저장합니다.
- 직접 입력 차단: 사용자가 입력한 `raw_ip`를 서버 API가 `IP_HASH_SALT`로 hash 처리하고, DB에는 `ip_hash`, `ip_masked`만 저장합니다.
- 차단 해제: 실제 삭제하지 않고 `is_active=false`, `released_at=now()`로 soft release 처리합니다.

IP 원문은 DB에 저장하지 않습니다. `IP_HASH_SALT`는 서버 환경변수로만 등록해야 하며 `NEXT_PUBLIC_` 접두어를 붙이면 안 됩니다.

자동 차단 규칙 확인 SQL:

```sql
select a.name, r.rule_key, r.rule_name, r.action, r.threshold, r.risk_delta, r.is_enabled, r.updated_at
from public.pm_block_rules r
join public.pm_advertisers a on a.id = r.advertiser_id
order by a.name, r.rule_key;
```

수동 차단 확인 SQL:

```sql
select a.name, b.client_id, b.ip_masked, b.reason, b.block_type, b.source, b.is_active, b.created_at, b.released_at
from public.pm_blocked_ips b
join public.pm_advertisers a on a.id = b.advertiser_id
order by b.created_at desc
limit 50;
```

차단 QA:

1. 자동 차단 규칙에서 `repeat_click_suspicious`를 OFF로 변경한 뒤 같은 IP로 3회 수집해도 `suspicious`가 되지 않는지 확인합니다.
2. 다시 ON으로 변경한 뒤 3회 수집 시 `suspicious`, 5회 수집 시 `blocked`가 반환되는지 확인합니다.
3. 후보 로그에서 차단 등록을 눌러 `pm_blocked_ips`에 row가 생성되는지 확인합니다.
4. 직접 IP 입력 차단 시 DB에 raw IP가 없고 `ip_hash`, `ip_masked`만 저장되는지 확인합니다.
5. 차단 해제 시 `is_active=false`, `released_at`이 저장되는지 확인합니다.
6. 활성 차단된 `ip_hash`로 다시 `/api/collect` 호출 시 `blocked` 처리되는지 확인합니다.

## 광고주 리포트 / CSV / 인쇄

광고주 리포트는 권한 범위 내 Supabase 운영 데이터를 기준으로 생성합니다.

사용 테이블:

- `pm_click_logs`: 클릭, 상태, 위험도, 체류시간, 유입/UTM, page_url, recent_count
- `pm_blocked_ips`: 활성 차단 IP, 차단 해제 이력
- `pm_conversion_events`: 전환 이벤트 수와 전환 추이
- `pm_advertisers`: 광고주명, client_id
- `pm_marketer_advertisers`: 마케터 담당 광고주 범위
- `pm_advertiser_users`: 광고주 계정 접근 범위

리포트 지표:

- 총/정상/의심/차단 클릭수
- 의심 클릭률, 차단 클릭률
- 평균 위험도, 평균 체류시간
- 최근 10분 반복 클릭 기준 TOP IP
- 의심 사유 TOP 5
- 유입 경로 TOP 5
- UTM source/medium/campaign 요약
- page_url TOP 5
- 전환 이벤트 수
- 예상 절감 광고비
- 활성 차단 IP 수
- 최근 차단/해제 이력

role별 접근:

- `admin`: 전체 광고주 리포트 조회 가능
- `marketer`: `pm_marketer_advertisers`에 연결된 담당 광고주만 조회 가능
- `advertiser`: `pm_advertiser_users`에 연결된 본인 광고주만 조회 가능하며 광고주 선택 드롭다운에도 본인 광고주만 표시

날짜 필터:

- 오늘
- 어제
- 최근 7일
- 최근 30일
- 직접 날짜 범위

리포트 날짜 필터는 KPI, 차트, CSV, 인쇄용 리포트에 동일하게 반영됩니다.

CSV 내보내기:

- 파일명: `progressmedia-invalid-click-report.csv`
- 한글 깨짐 방지를 위해 UTF-8 BOM을 포함합니다.
- 기본 컬럼: 광고주명, client_id, 시간, IP 마스킹, 페이지 URL, referrer, UTM source/medium/campaign, click_status, risk_score, recent_count, reason, stay_time, conversion 여부
- `ip_hash`는 기본 CSV에 포함하지 않습니다.

인쇄용 리포트:

- 리포트 화면의 인쇄 버튼은 `window.print()`를 사용합니다.
- 인쇄 시 사이드바와 필터 UI는 숨기고 리포트 본문만 출력합니다.
- A4 기준으로 광고주명, 기간, 생성일, KPI, 의심 사유, 차단 IP, 유입 경로, 전환 요약, IP 처리 안내 문구를 표시합니다.

리포트 확인 SQL:

```sql
select a.name, l.client_id, l.created_at, l.ip_masked, l.page_url, l.referrer,
       l.utm_source, l.utm_medium, l.utm_campaign, l.click_status,
       l.risk_score, l.recent_count, l.reason, l.stay_time
from public.pm_click_logs l
join public.pm_advertisers a on a.id = l.advertiser_id
order by l.created_at desc
limit 50;

select a.name, e.event_name, e.event_type, e.value, e.created_at
from public.pm_conversion_events e
join public.pm_advertisers a on a.id = e.advertiser_id
order by e.created_at desc
limit 50;

select a.name, b.ip_masked, b.reason, b.is_active, b.created_at, b.released_at
from public.pm_blocked_ips b
join public.pm_advertisers a on a.id = b.advertiser_id
order by b.created_at desc
limit 50;
```

리포트 QA:

1. admin으로 로그인해 전체 광고주 리포트가 보이는지 확인합니다.
2. marketer로 로그인해 담당 광고주만 보이는지 확인합니다.
3. advertiser로 로그인해 본인 광고주만 드롭다운에 표시되는지 확인합니다.
4. 날짜 필터를 변경했을 때 KPI, 차트, CSV, 인쇄 내용이 같이 바뀌는지 확인합니다.
5. CSV에 `ip_hash`가 포함되지 않는지 확인합니다.
6. 인쇄 미리보기에서 사이드바와 필터가 숨겨지는지 확인합니다.

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

광고주 로그인 계정 확인 SQL:

```sql
select
  au.id,
  a.name as advertiser_name,
  p.email as advertiser_email,
  p.name as contact_name,
  p.role,
  au.permission,
  p.is_active,
  au.created_at
from public.pm_advertiser_users au
join public.pm_profiles p on p.id = au.user_id
join public.pm_advertisers a on a.id = au.advertiser_id
order by au.created_at desc
limit 20;
```

광고주 로그인 QA:

1. 마케터로 로그인
2. `/advertisers`의 `광고주/사이트 등록` 탭에서 광고주명, 사이트 URL, 상태 입력
3. 광고주/사이트 등록 클릭
4. 광고주 목록에서 `계정 미발급` 배지와 `계정 발급` 버튼 확인
5. `광고주 로그인 계정 발급` 탭에서 광고주 선택, 담당자명, 외부 이메일, 임시 비밀번호 입력
6. 광고주 계정 발급 클릭
7. Supabase Auth Users에 광고주 이메일 생성 확인
8. 위 SQL로 `pm_advertisers`, `pm_marketer_advertisers`, `pm_profiles`, `pm_advertiser_users` 확인
9. 로그아웃 후 광고주 이메일/임시 비밀번호로 로그인
10. 광고주 계정에서 본인 광고주만 보이는지 확인
11. 설치 스크립트의 `data-client-id`, `data-project-key`가 DB 값과 일치하는지 확인

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
