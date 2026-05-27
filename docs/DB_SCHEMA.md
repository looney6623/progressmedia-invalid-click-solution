# DB SCHEMA

서버 구매 전 설계 초안입니다. 실제 DB는 PostgreSQL 기준을 권장하며, IP 원문 저장은 피하고 hash/masked 값을 중심으로 설계합니다.

## advertisers

광고주 기본 정보와 추적 스크립트 client id를 관리합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid / text | 광고주 PK |
| name | varchar(100) | 광고주명 |
| client_id | varchar(80) | 추적 스크립트 공개 식별자 |
| business_type | varchar(80) | 업종 |
| status | varchar(30) | active, paused, archived |
| memo | text | 운영 메모 |
| created_at | timestamptz | 등록일 |
| updated_at | timestamptz | 수정일 |

인덱스 후보:
- `unique(client_id)`
- `index(status)`
- `index(created_at)`

## click_logs

광고 클릭 또는 랜딩 진입 단위 로그입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid / text | 클릭 로그 PK |
| advertiser_id | uuid / text | 광고주 FK |
| visitor_id | varchar(120) | 방문자 식별자 |
| session_id | varchar(120) | 세션 식별자 |
| media | varchar(60) | 네이버 검색, 구글 검색 등 |
| campaign | varchar(120) | 캠페인명 |
| keyword | varchar(200) | 키워드 |
| landing_url | text | 랜딩 URL |
| referrer | text | 유입 referrer |
| ip_hash | varchar(128) | IP hash |
| ip_masked | varchar(60) | 마스킹 IP |
| user_agent | text | User-Agent |
| device_type | varchar(30) | PC, Mobile, Tablet |
| region | varchar(80) | 추정 지역 |
| dwell_seconds | integer | 체류시간 |
| page_views | integer | 페이지 이동 수 |
| click_count_10m | integer | 10분 내 반복 클릭 수 |
| risk_score | integer | 위험 점수 |
| status | varchar(30) | normal, suspicious, blocked |
| reason | text | 판정 사유 |
| cpc | integer | 추정 CPC |
| occurred_at | timestamptz | 클릭 발생 시각 |
| created_at | timestamptz | 저장 시각 |

인덱스 후보:
- `index(advertiser_id, occurred_at desc)`
- `index(advertiser_id, status, occurred_at desc)`
- `index(advertiser_id, ip_hash, occurred_at desc)`
- `index(media, occurred_at desc)`

## visitor_sessions

방문자 세션의 행동 요약을 저장합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid / text | 세션 PK |
| advertiser_id | uuid / text | 광고주 FK |
| visitor_id | varchar(120) | 방문자 식별자 |
| session_id | varchar(120) | 세션 식별자 |
| first_click_id | uuid / text | 최초 클릭 로그 |
| started_at | timestamptz | 세션 시작 |
| ended_at | timestamptz | 세션 종료 |
| duration_seconds | integer | 총 체류시간 |
| page_views | integer | 페이지뷰 수 |
| converted | boolean | 전환 여부 |
| last_url | text | 마지막 페이지 |
| created_at | timestamptz | 저장 시각 |
| updated_at | timestamptz | 수정 시각 |

인덱스 후보:
- `unique(advertiser_id, session_id)`
- `index(advertiser_id, visitor_id)`
- `index(advertiser_id, started_at desc)`

## blocked_ips

수동/자동 차단 IP를 관리합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid / text | 차단 PK |
| advertiser_id | uuid / text | 광고주 FK |
| ip_hash | varchar(128) | IP hash |
| ip_masked | varchar(60) | 마스킹 IP |
| method | varchar(30) | manual, auto |
| reason | text | 차단 사유 |
| source_click_id | uuid / text | 자동 차단 기준 클릭 |
| starts_at | timestamptz | 차단 시작 |
| ends_at | timestamptz | 차단 종료 |
| released_at | timestamptz | 해제 시각 |
| released_by | varchar(120) | 해제 관리자 |
| created_by | varchar(120) | 등록 관리자 또는 system |
| created_at | timestamptz | 등록 시각 |

인덱스 후보:
- `index(advertiser_id, ip_hash)`
- `index(advertiser_id, starts_at desc)`
- `index(method, starts_at desc)`
- `index(released_at)`

## conversion_events

상담 신청, 구매, 회원가입 등 전환 이벤트를 저장합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid / text | 전환 이벤트 PK |
| advertiser_id | uuid / text | 광고주 FK |
| visitor_id | varchar(120) | 방문자 식별자 |
| session_id | varchar(120) | 세션 식별자 |
| click_id | uuid / text | 관련 클릭 로그 |
| event_name | varchar(120) | conversion, lead, purchase 등 |
| event_value | numeric | 구매액 또는 전환 가치 |
| url | text | 이벤트 발생 URL |
| metadata | jsonb | 추가 속성 |
| occurred_at | timestamptz | 발생 시각 |
| created_at | timestamptz | 저장 시각 |

인덱스 후보:
- `index(advertiser_id, occurred_at desc)`
- `index(session_id)`
- `index(click_id)`

## detection_rules

무효클릭 판정 규칙을 관리합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid / text | 규칙 PK |
| code | varchar(80) | rule_repeat_10m_3 등 |
| name | varchar(120) | 규칙명 |
| description | text | 설명 |
| condition_json | jsonb | 조건 |
| action | varchar(30) | suspicious, block, score_add |
| risk_score | integer | 부여 또는 증가 점수 |
| enabled | boolean | 활성 여부 |
| created_at | timestamptz | 등록 시각 |
| updated_at | timestamptz | 수정 시각 |

인덱스 후보:
- `unique(code)`
- `index(enabled)`

## report_exports

관리자가 다운로드한 리포트 이력을 저장합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid / text | 내보내기 PK |
| advertiser_id | uuid / text | 광고주 FK, 전체 리포트면 null |
| requested_by | varchar(120) | 요청 관리자 |
| format | varchar(20) | csv, xlsx, pdf |
| filter_json | jsonb | 적용 필터 |
| file_url | text | 저장된 파일 URL, 선택 |
| status | varchar(30) | queued, completed, failed |
| created_at | timestamptz | 요청 시각 |
| completed_at | timestamptz | 완료 시각 |

인덱스 후보:
- `index(requested_by, created_at desc)`
- `index(advertiser_id, created_at desc)`
- `index(status)`
