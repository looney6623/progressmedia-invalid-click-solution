# API SPEC

이 문서는 서버 구매 및 실제 연동 전 기준의 API 초안입니다. 현재 프로젝트에는 실제 API가 연결되어 있지 않으며, `services/clickService.js`는 더미 데이터를 반환합니다.

## 공통 규칙

- 요청/응답 형식: JSON
- 시간 형식: ISO 8601
- 인증: 추후 관리자 API는 세션 또는 JWT, 수집 API는 광고주별 `client_id`와 서명 토큰 검토
- 개인정보: IP 원문 저장은 제한하고 서버에서 hash/masking 처리 권장
- 페이지네이션: 목록 API는 `page`, `limit` 또는 `cursor` 지원 권장

## POST /api/collect

클릭 또는 최초 방문 로그를 수집합니다. 광고 랜딩 페이지 진입 시 추적 스크립트가 호출합니다.

### Request Body

```json
{
  "client_id": "pm-shabu20",
  "visitor_id": "v_7f8a9c2e",
  "session_id": "s_20260527_7f8a",
  "occurred_at": "2026-05-27T14:30:00+09:00",
  "url": "https://example.com/landing",
  "referrer": "https://search.naver.com/",
  "utm": {
    "source": "naver",
    "medium": "cpc",
    "campaign": "brand-defense",
    "term": "샤브20 가격"
  },
  "click": {
    "campaign": "브랜드 방어",
    "keyword": "샤브20 가격",
    "media": "네이버 검색",
    "cpc": 1320
  },
  "device": {
    "user_agent": "Mozilla/5.0 ...",
    "screen": "390x844",
    "language": "ko-KR"
  }
}
```

### Response

```json
{
  "ok": true,
  "click_id": "clk_01HX...",
  "session_id": "s_20260527_7f8a",
  "status": "normal",
  "risk_score": 18
}
```

## POST /api/events

페이지뷰, 체류시간, 전환 이벤트를 수집합니다. 최초 클릭 이후 행동 품질을 판단하는 보조 이벤트입니다.

### Request Body

```json
{
  "client_id": "pm-shabu20",
  "visitor_id": "v_7f8a9c2e",
  "session_id": "s_20260527_7f8a",
  "event_type": "page_view",
  "occurred_at": "2026-05-27T14:31:12+09:00",
  "url": "https://example.com/menu",
  "duration_ms": 72000,
  "metadata": {
    "page_title": "샤브20 메뉴",
    "conversion_name": null,
    "value": null
  }
}
```

### Response

```json
{
  "ok": true,
  "event_id": "evt_01HX...",
  "session_summary": {
    "page_views": 2,
    "dwell_seconds": 72
  }
}
```

## GET /api/clicks

관리자 화면에서 클릭 로그를 조회합니다.

### Query Parameters

```text
advertiser_id=adv_001
media=naver
status=blocked
date_from=2026-05-01
date_to=2026-05-27
q=211.44
page=1
limit=50
```

### Response

```json
{
  "items": [
    {
      "id": "clk_01HX...",
      "advertiser_id": "adv_001",
      "advertiser_name": "샤브20",
      "media": "네이버 검색",
      "campaign": "브랜드 방어",
      "keyword": "샤브20 가격",
      "ip_masked": "211.44.*.91",
      "risk_score": 95,
      "status": "blocked",
      "reason": "10분 내 5회 이상 반복 클릭",
      "created_at": "2026-05-27T14:30:00+09:00"
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 124
}
```

## GET /api/reports

광고주별 요약 리포트를 조회합니다.

### Query Parameters

```text
advertiser_id=adv_001
date_from=2026-05-01
date_to=2026-05-27
group_by=advertiser
```

### Response

```json
{
  "summary": {
    "total_clicks": 1240,
    "normal_clicks": 1088,
    "suspicious_clicks": 92,
    "blocked_clicks": 60,
    "suspicious_rate": 12.26,
    "estimated_saved_cost": 79200
  },
  "by_media": [
    { "media": "네이버 검색", "total": 620, "blocked": 22 }
  ],
  "by_hour": [
    { "hour": "14:00", "total": 44, "blocked": 6 }
  ],
  "top_reasons": [
    { "reason": "10분 내 5회 이상 반복 클릭", "count": 21 }
  ],
  "blocked_ips": [
    { "ip_masked": "211.44.*.91", "blocked_at": "2026-05-27T14:30:00+09:00" }
  ]
}
```

## POST /api/blocks

수동 차단 IP를 등록합니다.

### Request Body

```json
{
  "advertiser_id": "adv_001",
  "ip": "211.44.18.91",
  "reason": "브랜드 키워드 반복 클릭",
  "duration_days": 30
}
```

### Response

```json
{
  "ok": true,
  "block": {
    "id": "blk_01HX...",
    "advertiser_id": "adv_001",
    "ip_masked": "211.44.*.91",
    "method": "manual",
    "reason": "브랜드 키워드 반복 클릭",
    "starts_at": "2026-05-27T14:30:00+09:00",
    "ends_at": "2026-06-26T14:30:00+09:00"
  }
}
```

## DELETE /api/blocks/:id

차단을 해제합니다.

### Response

```json
{
  "ok": true,
  "released_block_id": "blk_01HX...",
  "released_at": "2026-05-27T15:00:00+09:00"
}
```

## GET /api/advertisers

광고주 목록을 조회합니다.

### Response

```json
{
  "items": [
    {
      "id": "adv_001",
      "name": "샤브20",
      "client_id": "pm-shabu20",
      "status": "active",
      "created_at": "2026-05-01T09:00:00+09:00"
    }
  ]
}
```

## POST /api/advertisers

광고주를 등록합니다.

### Request Body

```json
{
  "name": "샤브20",
  "business_type": "프랜차이즈",
  "default_media": ["네이버 검색", "구글 검색"],
  "memo": "브랜드 키워드 방어 캠페인 운영"
}
```

### Response

```json
{
  "ok": true,
  "advertiser": {
    "id": "adv_001",
    "name": "샤브20",
    "client_id": "pm-shabu20",
    "status": "active"
  }
}
```

## GET /api/install-script/:advertiserId

광고주별 설치 스크립트를 조회합니다.

### Response

```json
{
  "advertiser_id": "adv_001",
  "client_id": "pm-shabu20",
  "install_status": "collecting",
  "last_seen_at": "2026-05-27T14:28:11+09:00",
  "script": "<script>...</script>"
}
```
