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
- 광고주, 매체, 상태, 날짜, 검색어 필터
- 시간대별 클릭 추이, 클릭 상태 분포, 광고주별/매체별 클릭 차트
- 실시간 클릭 로그 테이블
- CSV 리포트 다운로드
- 자동 판정 로직: 10분 내 3회 의심, 10분 내 5회 차단, 짧은 체류/무이동 위험도 증가
- 프론트 상태 기반 수동 차단 IP 추가/해제
- 광고주별 설치 스크립트 패널과 복사 완료 상태
- 광고주별 상세 리포트, 의심 사유 TOP 5, 차단 IP 목록, 인쇄 버튼

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
