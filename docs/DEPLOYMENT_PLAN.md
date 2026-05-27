# DEPLOYMENT PLAN

서버 구매 전후 단계별 실행 계획입니다. 현재 프로젝트는 프론트 데모이며 실제 서버/DB/추적 SDK는 연결되어 있지 않습니다.

## 단계 0: 현재 상태

- Next.js 프론트 데모 완료
- 더미 데이터 기반 대시보드, 로그, 차단 관리, 설치 스크립트, 리포트 구현
- mock service 구조 준비
- 실제 수집 API, DB, CDN, 추적 스크립트 미연동

## 단계 1: 서버리스 테스트

목표:

- 실제 수집 API의 최소 형태 검증
- 클릭 로그 저장과 관리자 조회 흐름 검증
- IP hash/masking 처리 위치 확정

후보:

- Vercel Functions + Supabase
- Cloudflare Workers + Supabase

작업:

- `/api/collect`, `/api/events` 최소 구현
- Supabase PostgreSQL 테이블 생성
- 관리자 API 인증 방식 검토
- 추적 스크립트 정적 파일 초안 작성

## 단계 2: VPS 또는 클라우드 서버 구매

목표:

- 장기 운영 가능한 백엔드 구성
- 로그 수집량 증가에 대비
- 광고주별 데이터 분리와 관리자 권한 체계 적용

추천 후보:

| 후보 | 장점 | 주의점 |
| --- | --- | --- |
| Vercel + Supabase | Next.js 배포 쉬움, 초기 속도 빠름 | 대량 이벤트 비용 확인 필요 |
| Cloudflare Workers + Supabase | edge 수집에 유리, 비용 효율 좋음 | 런타임 제약 검토 필요 |
| AWS Lightsail + PostgreSQL | 단순 VPS 운영, 비용 예측 쉬움 | 서버 운영/보안 관리 필요 |

## 단계 3: 1차 실서비스 연동

목표:

- 1~2개 광고주에 추적 스크립트 설치
- 실제 클릭 수집과 리포트 검증
- 오탐/누락 케이스 확인

## 1차 일정표 예시

| 주차 | 작업 | 산출물 |
| --- | --- | --- |
| 1주차 | API/DB 최종 설계, Supabase 테이블 생성 | 확정 schema, migration |
| 2주차 | collect/events API 구현, mock service를 fetch로 교체 | 수집 API, 관리자 조회 API |
| 3주차 | 추적 스크립트 alpha 제작, 테스트 랜딩 설치 | SDK alpha, QA 체크리스트 |
| 4주차 | 광고주 1곳 파일럿 연동 | 실제 클릭 로그, 리포트 |
| 5주차 | 차단 정책 보정, 개인정보 문구 반영 | 정책 v1, 개인정보처리방침 초안 |
| 6주차 | 운영 배포, 장애/알림/백업 점검 | 운영 체크리스트 |

## 운영 전 체크리스트

- HTTPS 적용
- CORS 허용 도메인 제한
- 관리자 인증
- IP hash salt 관리
- DB 백업 정책
- 로그 보관 기간 자동 정리
- CSV 내보내기 감사 로그
- 장애 알림 채널
- 개인정보처리방침 반영
