# 프로그레스미디어 무효클릭차단 솔루션

Next.js 14, React, TailwindCSS, Recharts 기반의 무효클릭차단 관리자 대시보드 데모입니다. 현재 버전은 서버/DB/실제 추적 스크립트와 연결하지 않고 더미 데이터와 mock 인증 상태로 동작합니다.

## 실행 방법

```bash
npm install
npm run dev
```

빌드 확인:

```bash
npm run build
```

## 현재 구현 기능

- role 기반 로그인 화면과 대시보드 접근 제어
- 관리자, 마케터, 광고주 role별 메뉴 분리
- 광고주 권한 범위에 따른 KPI, 차트, 로그, 차단 관리, 리포트 필터링
- 오늘 총 클릭수, 정상/의심/차단 클릭수, 의심 클릭률, 예상 절감 광고비 KPI
- 광고주별/매체별/시간대별 클릭 차트
- 실시간 클릭 로그 테이블, 상태 배지, IP 마스킹, 상세 모달
- 무효클릭 자동 판정 로직
- 수동 차단 IP 추가/해제 UI
- 설치 스크립트 발급 화면과 복사 안내
- 광고주 리포트, 인쇄 레이아웃, CSV 내보내기
- 마케터의 광고주 생성 및 광고주 계정 발급 mock 플로우

## 계정 구조

- 관리자: 서버 운영자가 Supabase Auth/DB에서 직접 생성하는 마스터 계정입니다. 일반 로그인 화면에서 관리자 계정을 생성할 수 없습니다.
- 마케터: 내부 직원이 로그인 화면에서 직접 계정을 생성할 수 있습니다. 회원가입 시 role은 항상 `marketer`로 저장됩니다.
- 광고주: 마케터가 대시보드 내부의 광고주 생성/광고주 계정 관리 화면에서 생성하고 발급합니다. 광고주 계정은 role `advertiser`로 저장되며 `pm_advertiser_users`를 통해 특정 `advertiser_id`와 연결됩니다.

관리자 계정은 운영 대표 또는 서버 운영자만 알고 있는 별도 마스터 계정 개념입니다. UI에는 “관리자 계정 생성하기” 또는 admin role 선택을 노출하지 않습니다.

## 권한 구조

- `admin`: 전체 마케터, 전체 광고주, 전체 로그, 전체 차단, 전체 리포트를 조회/관리합니다.
- `marketer`: 본인이 생성했거나 `pm_marketer_advertisers`에 배정된 광고주만 조회/관리합니다.
- `advertiser`: `pm_advertiser_users`에 연결된 본인 광고주의 로그, 차단, 리포트, 설치 스크립트만 확인합니다.

A 마케터가 a/b/c 광고주를 관리하고 B 마케터가 d/e/f 광고주를 관리하는 식으로 데이터 접근 범위가 분리되도록 설계했습니다. 실제 운영에서는 Supabase RLS 정책으로 이 분리를 반드시 DB 레벨에서 강제해야 합니다.

## 광고주 생성 플로우

마케터는 로그인 후 `광고주 생성` 화면에서 다음 정보를 입력합니다.

- 광고주명
- 사이트 URL
- 광고주 담당자명
- 광고주 로그인 이메일
- 권한: `view` 또는 `manage`
- 상태: `active` 또는 `inactive`

mock fallback에서는 생성과 동시에 다음 값이 자동 발급됩니다.

- `client_id`
- `project_key`
- 설치 스크립트
- 광고주 mock 계정
- 현재 로그인한 마케터에 대한 `manage` 배정

실제 Supabase 연동 시 광고주 Auth 계정 생성은 service role key가 필요한 작업이므로 클라이언트가 아니라 서버 API 또는 Supabase Edge Function에서 처리해야 합니다.

## 광고주 계정 생성 플로우

마케터는 `광고주 계정 관리` 화면에서 본인 담당 광고주의 계정을 추가로 생성하거나 관리할 수 있습니다.

- 광고주 계정 목록 조회
- 계정 생성
- 권한 변경
- 비활성화
- 임시 비밀번호 재발급 UI
- 초대 링크 복사 UI

광고주 계정은 반드시 특정 광고주와 연결되어야 하며, 연결 정보는 `pm_advertiser_users` 테이블에 저장합니다.

## Supabase Auth 설정

현재는 Supabase 환경변수가 없으면 mock 로그인으로 동작합니다. 실제 계정 연동 시 배포 환경에 아래 값을 등록합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트에 절대 노출하지 않습니다.
- service role key는 서버 API, Supabase Edge Function, 배치 작업에서만 사용합니다.
- 브라우저에서는 anon key와 RLS 정책으로 접근 범위를 제한합니다.

## Supabase Auth 사용자 생성 방법

- 관리자: 서버 운영자가 Supabase Auth/DB 콘솔 또는 안전한 서버 스크립트에서 직접 생성합니다.
- 마케터: 로그인 화면의 `마케터 계정 생성하기`에서 생성합니다. role은 `marketer`로 고정됩니다.
- 광고주: 마케터가 대시보드에서 광고주 생성 또는 광고주 계정 관리 기능으로 발급합니다. role은 `advertiser`로 고정됩니다.

## Cloudtype 환경변수

Cloudtype 배포 시 프로젝트 환경변수에 아래 값을 등록합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

서버 API를 추가한 뒤 service role key가 필요해지면 서버 전용 환경변수로만 등록하고 `NEXT_PUBLIC_` prefix를 붙이지 않습니다.

## Mock 로그인 fallback

Supabase 환경변수가 없을 때 개발 확인용으로 사용할 수 있는 예시 계정입니다. 로그인 화면의 mock 안내는 테스트 편의를 위한 것이며, 실제 운영 계정이 고정 계정으로 운영된다는 의미가 아닙니다.

- `admin@progressmedia.co.kr` / 개발·마스터 테스트용
- `marketer1@progressmedia.co.kr` / 마케터 예시 / 샤브20, 3분페이 관리
- `marketer2@progressmedia.co.kr` / 마케터 예시 / 대주바이오, 바른숨병원 관리
- `client-shabu20@example.com` / 광고주 예시 / 샤브20만 접근
- `client-3pay@example.com` / 광고주 예시 / 3분페이만 접근

mock 모드에서는 비밀번호를 검증하지 않고 이메일만 확인합니다. 실제 운영 전에는 Supabase Auth와 RLS 적용이 필요합니다.

## docs 설계 문서

서버 구매 전 실제 연동을 준비하기 위한 설계 문서를 `docs/`에 정리했습니다.

- `docs/API_SPEC.md`: 수집, 이벤트, 로그 조회, 리포트, 차단, 광고주, 설치 스크립트 API 초안
- `docs/DB_SCHEMA.md`: 광고주, 클릭 로그, 세션, 차단 IP, 전환 이벤트, 판정 규칙, 리포트 내보내기 테이블 설계
- `docs/TRACKING_SCRIPT_SPEC.md`: 광고주 사이트 삽입 스크립트, visitor/session 생성, UTM/referrer, 체류시간, 전환 이벤트, fallback 정책
- `docs/BLOCKING_POLICY.md`: 무효클릭 판정 기준, 자동/수동 차단, 차단 기간, 오탐 해제, 광고 플랫폼 과금 차단과 사이트 접근 차단의 차이
- `docs/PRIVACY_LOG_POLICY.md`: IP 처리, cookie/localStorage 고지, 로그 보관, 광고주별 데이터 분리, 삭제 요청 대응
- `docs/DEPLOYMENT_PLAN.md`: 프론트 데모 이후 서버리스 테스트, VPS/클라우드 후보, 1차 실서비스 일정
- `docs/AUTH_RLS_SCHEMA.sql`: Supabase Auth, role, 광고주 배정, 광고주 계정 연결, RLS 정책 초안

## RLS 적용 필요성

마케터/광고주별 접근 제한은 클라이언트 필터링만으로 보호할 수 없습니다. Supabase 테이블에 RLS를 활성화하고 `auth.uid()` 기준으로 다음 정책을 적용해야 합니다.

- admin은 전체 `pm_` 데이터 조회/관리 가능
- marketer는 `pm_marketer_advertisers`에 연결된 광고주만 조회/관리 가능
- marketer는 본인 담당 광고주의 광고주 계정만 생성/관리 가능
- advertiser는 `pm_advertiser_users`에 연결된 본인 광고주의 `click_logs`, `blocked_ips`, `reports`만 조회 가능
- service role key는 서버 API에서만 사용

## 주요 파일 구조

```text
app/
  globals.css
  layout.jsx
  page.jsx
components/
  DashboardApp.jsx
  LoginPage.jsx
  Sidebar.jsx
  FilterBar.jsx
  KpiCards.jsx
  ClickTrendChart.jsx
  ClickStatusChart.jsx
  AdvertiserChart.jsx
  MediaChart.jsx
  ClickLogTable.jsx
  BlockManagement.jsx
  InstallScriptPanel.jsx
  AdvertiserReport.jsx
  AdvertiserCreatePanel.jsx
  AdvertiserUserManagement.jsx
  AdminManagement.jsx
docs/
  API_SPEC.md
  DB_SCHEMA.md
  TRACKING_SCRIPT_SPEC.md
  BLOCKING_POLICY.md
  PRIVACY_LOG_POLICY.md
  DEPLOYMENT_PLAN.md
  AUTH_RLS_SCHEMA.sql
lib/
  clickData.js
  detectInvalidClick.js
  filterClicks.js
  exportCsv.js
  format.js
  supabaseClient.js
services/
  clickService.js
```

## 향후 서버 연동 계획

- `services/clickService.js`의 mock 반환 함수를 fetch API 호출로 교체
- 클릭 로그, 차단 IP, 설치 상태, 리포트를 Supabase/PostgreSQL에서 조회
- 수동 차단 추가/해제를 POST/DELETE API와 연결
- 광고주 Auth 계정 생성은 service role key를 사용하는 서버 API로 분리
- 추적 스크립트 수집 API와 판정/차단 정책을 서버에서 실행
