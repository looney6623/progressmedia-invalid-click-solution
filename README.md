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

## 더미 데이터

광고주 예시는 광고대행 운영 업무에 맞춰 `샤브20`, `3분페이`, `대주바이오`, `바른숨병원`, `온리원쇼핑몰`로 구성했습니다. 매체는 `네이버 검색`, `구글 검색`, `메타`, `카카오`, `제휴 매체`를 사용합니다.

## 서버 미연동 상태

현재 모든 데이터는 `lib/clickData.js`의 더미 데이터에서 생성됩니다. 수동 차단 IP, 설치 상태, 최근 수집 시간도 브라우저 상태 또는 정적 더미 값입니다.

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
lib/
  clickData.js
  detectInvalidClick.js
  filterClicks.js
  exportCsv.js
  format.js
services/
  clickService.js
```
