# 프로그레스미디어 무효클릭차단 솔루션

Next.js 14, React, TailwindCSS, Recharts 기반의 무효클릭차단 관리자 대시보드 데모입니다. 현재 버전은 서버와 DB를 연결하지 않고 더미 클릭 데이터와 프론트 상태값만 사용합니다.

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

- 메인 대시보드 KPI: 총 클릭, 정상, 의심, 차단, 의심 클릭률, 예상 절감 광고비
- 광고주, 매체, 상태, 날짜, 검색어 통합 필터
- 메뉴 클릭 및 스크롤 위치에 따른 현재 메뉴 활성 표시
- 시간대별 클릭 추이, 클릭 상태 분포, 광고주별/매체별 클릭 차트
- 실시간 클릭 로그 테이블
  - 총 건수 표시
  - 최신순/위험도 높은 순 정렬
  - IP 마스킹 옵션
  - 클릭 상세 보기 모달
- CSV 리포트 다운로드
- 자동 판정 로직: 10분 내 3회 의심, 10분 내 5회 차단, 짧은 체류/무이동 위험도 증가
- 차단 관리
  - 자동/수동 차단 IP 목록 테이블
  - 차단 시작일, 사유, 방식 표시
  - 수동 차단 추가/해제 및 해제 확인 메시지
- 광고주별 설치 스크립트 패널
  - 설치 방법 3단계 안내
  - Head 태그 삽입 예시
  - 복사 완료 안내
  - 서버 미연동 예시 상태 표시
- 광고주별 상세 리포트
  - 광고주 선택 드롭다운
  - KPI 카드, 매체별 클릭, 시간대별 클릭
  - 의심 사유 TOP 5, 차단 IP 목록
  - `window.print()` 기반 인쇄 버튼
  - 인쇄 시 사이드바와 필터 숨김

## docs 설계 문서

서버 구매 전 실제 연동을 준비하기 위한 설계 문서를 `docs/`에 정리했습니다.

- `docs/API_SPEC.md`: 수집, 이벤트, 로그 조회, 리포트, 차단, 광고주, 설치 스크립트 API 초안
- `docs/DB_SCHEMA.md`: 광고주, 클릭 로그, 세션, 차단 IP, 전환 이벤트, 탐지 규칙, 리포트 내보내기 테이블 설계
- `docs/TRACKING_SCRIPT_SPEC.md`: 광고주 사이트 삽입 스크립트, visitor/session 생성, UTM/referrer, 체류시간, 전환 이벤트, fallback 정책
- `docs/BLOCKING_POLICY.md`: 무효클릭 판정 기준, 위험도, 차단 기간, 오탐 해제, 플랫폼 과금 차단과 사이트 접근 차단 차이
- `docs/PRIVACY_LOG_POLICY.md`: IP 처리, cookie/localStorage 고지, 로그 보관, 광고주별 데이터 분리, 삭제 요청 대응
- `docs/DEPLOYMENT_PLAN.md`: 서버리스 테스트, 서버 구매 후보, 1차 실서비스 일정표
- `docs/AUTH_RLS_SCHEMA.sql`: Supabase Auth 프로필, 마케터-광고주 배정, RLS 정책 SQL 초안

## Supabase Auth 설정

현재 앱은 Supabase 환경변수가 없으면 mock 로그인으로 동작합니다. 실제 계정 연동 시 아래 환경변수를 배포 환경에 등록합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트에 절대 넣지 않습니다.
- service role key는 서버 API, Supabase Edge Function, 배치 작업에서만 사용합니다.
- 브라우저에서는 anon key와 RLS 정책으로 접근 범위를 제한합니다.

## Cloudtype 환경변수 설정

Cloudtype 배포 시 프로젝트 환경변수에 아래 값을 등록합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

서비스 역할 키가 필요한 서버 API를 나중에 추가할 경우 서버 런타임 전용 환경변수로만 등록하고, `NEXT_PUBLIC_` prefix를 붙이지 않습니다.

## 관리자/마케터 권한 구조

- `admin`: 전체 광고주, 클릭 로그, 차단 IP, 리포트 조회/관리 가능
- `marketer`: `pm_marketer_advertisers`에 배정된 광고주의 로그/차단/리포트만 조회 가능
- 마케터의 수동 차단 등록은 담당 광고주 중 `manage` 권한이 있는 광고주에 한정하는 것을 권장합니다.
- 관리자 전용 메뉴:
  - 직원 계정 관리
  - 광고주 배정 관리

## Mock 로그인 fallback

Supabase 환경변수가 없으면 아래 mock 계정으로 로그인할 수 있습니다.

- `admin@progressmedia.co.kr` / 관리자
- `marketer1@progressmedia.co.kr` / 윤인홍 / 담당 광고주: 샤브20, 3분페이
- `marketer2@progressmedia.co.kr` / 마케터B / 담당 광고주: 대주바이오, 바른숨병원

mock 모드에서는 입력한 비밀번호를 검증하지 않고 이메일만 확인합니다. 실제 운영 전에는 Supabase Auth와 RLS 적용이 필요합니다.

## RLS 적용 필요성

마케터 계정은 클라이언트에서 필터를 숨기는 것만으로는 보호되지 않습니다. Supabase 테이블에 RLS를 활성화하고, `auth.uid()` 기준으로 `pm_marketer_advertisers`에 배정된 광고주 데이터만 조회되도록 정책을 적용해야 합니다.

## 더미 데이터

광고주 예시는 광고대행 운영 업무에 맞춰 `샤브20`, `3분페이`, `대주바이오`, `바른숨병원`, `온리원쇼핑몰`로 구성했습니다. 매체는 `네이버 검색`, `구글 검색`, `메타`, `카카오`, `제휴 매체`를 사용합니다.

## 서버 미연동 상태

현재 모든 데이터는 `lib/clickData.js`의 더미 데이터에서 생성됩니다. 수동 차단 IP, 설치 상태, 최근 수집 시간도 브라우저 상태 또는 정적 더미 값입니다. `services/clickService.js`는 향후 실제 API로 교체하기 쉽도록 mock 함수 형태로 구성되어 있습니다.

## 향후 서버 연동 계획

- `services/clickService.js`의 더미 반환 함수를 fetch API 호출로 교체
- 클릭 로그, 차단 IP, 설치 스크립트 상태를 API에서 조회
- 수동 차단 추가/해제를 POST/DELETE API로 연결
- CSV/광고주 리포트는 현재 프론트 생성 방식 유지 또는 서버 생성 방식으로 전환 가능

## 주요 파일 구조

```text
app/
  globals.css
  layout.jsx
  page.jsx
components/
  DashboardApp.jsx
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
  ui.js
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
services/
  clickService.js
```
