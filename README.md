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

## 화면 구조

원페이지 섹션 이동 구조를 Next.js App Router 기반의 개별 페이지 구조로 변경했습니다. 사이드바 메뉴 클릭 시 URL이 실제로 변경됩니다.

- `/`: 로그인 화면. 로그인된 사용자는 `/dashboard`로 이동합니다.
- `/dashboard`: KPI, 클릭 추이, 상태 분포, 광고주/매체별 요약
- `/advertisers`: 광고주 관리 통합 화면
- `/logs`: 실시간 클릭 로그
- `/analysis`: 무효클릭 분석
- `/blocks`: 차단 관리
- `/reports`: 광고주 리포트와 CSV 내보내기
- `/account`: 내 계정과 접근 가능한 광고주 확인

로그인 후 화면은 `AppShell` 공통 레이아웃을 사용합니다. `AppShell`은 `Sidebar`, `PageHeader`, 본문 영역을 공통으로 제공합니다.

## 메뉴 구조

좌측 사이드바는 실서비스 관리자 도구에 맞춰 아래 메뉴로 정리했습니다.

- 대시보드
- 광고주 관리
- 실시간 클릭 로그
- 무효클릭 분석
- 차단 관리
- 광고주 리포트
- 내 계정
- 로그아웃

활성 메뉴는 브랜드 민트 배경으로 표시되며, hover 상태와 아이콘 정렬을 통일했습니다.

## 광고주 관리 통합

기존에 분리되어 있던 내 광고주, 광고주 생성, 광고주 계정 관리, 설치 스크립트 기능을 `/advertisers` 페이지로 통합했습니다.

광고주 관리 페이지 구성:

- 요약 카드: 내 광고주 수, 활성 광고주 수, 설치 완료 수, 광고주 계정 수
- 탭 1: 광고주 목록
- 탭 2: 광고주 생성
- 탭 3: 광고주 계정 관리
- 탭 4: 설치 스크립트

광고주 생성과 광고주 계정 관리는 기존 mock fallback 구조를 유지합니다. 광고주 계정은 광고주 담당자 이메일을 사용할 수 있으며 `pm_advertiser_users`를 통해 특정 광고주와 연결되는 구조입니다.

## role별 메뉴 접근

- `admin`: 전체 메뉴 접근 가능
- `marketer`: 대시보드, 광고주 관리, 실시간 클릭 로그, 무효클릭 분석, 차단 관리, 광고주 리포트, 내 계정 접근 가능
- `advertiser`: 대시보드, 실시간 클릭 로그, 차단 관리, 광고주 리포트, 내 계정 접근 가능

광고주 role은 `/advertisers`와 `/analysis`에 접근할 수 없습니다. 직접 URL로 접근하면 권한 없음 화면이 표시됩니다.

## 데이터 접근 범위

기존 role별 광고주 필터링은 유지됩니다.

- `admin`: 전체 광고주 데이터 접근
- `marketer`: 본인이 생성했거나 배정받은 광고주만 접근
- `advertiser`: 본인 광고주만 접근

이 접근 범위는 KPI, 차트, 로그, 차단 관리, 리포트, 광고주 관리 화면에 동일하게 반영됩니다.

## 계정 구조

- 관리자: 서버 운영자가 Supabase Auth/DB에서 직접 생성하는 마스터 계정입니다. 일반 로그인 화면에서 생성할 수 없습니다.
- 마케터: 내부 직원이 로그인 화면에서 직접 계정을 생성할 수 있습니다. 회사 내부 마케터 계정 도메인은 `@my-progress.co.kr` 기준이며, 회원가입 시 role은 항상 `marketer`로 저장됩니다.
- 광고주: 마케터가 대시보드 내부의 광고주 생성/광고주 계정 관리 화면에서 발급합니다. 광고주 담당자 이메일을 사용할 수 있으며 role은 `advertiser`로 저장됩니다.

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

## Mock 로그인 fallback

Supabase 환경변수가 없을 때 개발 확인용으로 사용할 수 있는 예시 계정입니다. 로그인 화면에는 mock 계정 목록을 노출하지 않습니다.

- `admin@my-progress.co.kr` / 개발·마스터 테스트용
- `yxxn98@my-progress.co.kr` / 마케터 예시 / 샤브20, 3분페이 관리
- `marketer2@my-progress.co.kr` / 마케터B 예시 / 대주바이오, 바른숨병원 관리
- `client-shabu20@example.com` / 광고주 예시 / 샤브20만 접근
- `client-3pay@example.com` / 광고주 예시 / 3분페이만 접근

mock 모드에서는 비밀번호를 검증하지 않고 이메일만 확인합니다. 실제 운영 전에는 Supabase Auth와 RLS 적용이 필요합니다.

## 주요 파일 구조

```text
app/
  page.jsx
  dashboard/page.jsx
  advertisers/page.jsx
  logs/page.jsx
  analysis/page.jsx
  blocks/page.jsx
  reports/page.jsx
  account/page.jsx
components/
  AppStateProvider.jsx
  AppShell.jsx
  PageHeader.jsx
  Sidebar.jsx
  LoginPage.jsx
  AdvertisersWorkspace.jsx
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
