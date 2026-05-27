# TRACKING SCRIPT SPEC

광고주 사이트에 삽입할 추적 스크립트 설계 초안입니다. 현재 프로젝트에는 실제 SDK 파일이나 수집 서버가 없습니다.

## 설치 코드 예시

광고주 랜딩 페이지의 `</head>` 직전 또는 공통 head 템플릿에 삽입합니다.

```html
<script>
(function(w,d,s,u,c){
  w.pmInvalidClick=w.pmInvalidClick||function(){(w.pmInvalidClick.q=w.pmInvalidClick.q||[]).push(arguments)};
  w.pmInvalidClick("init",{clientId:c});
  var js=d.createElement(s); js.async=true; js.src=u;
  d.head.appendChild(js);
})(window,document,"script","https://cdn.progressmedia.co.kr/invalid-click.js","pm-shabu20");
</script>
```

## 수집 항목

- 광고주 식별자: `client_id`
- 방문자 식별자: `visitor_id`
- 세션 식별자: `session_id`
- 페이지 URL, path, title
- referrer
- UTM: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- 광고 키워드, 캠페인, 매체 값
- User-Agent, 화면 크기, 언어
- IP 관련 정보는 브라우저에서 수집하지 않고 서버 요청에서 추정
- 페이지뷰 수
- 체류시간
- 전환 이벤트명과 전환 값

## visitor_id 생성 방식

권장 방식:

1. localStorage 또는 first-party cookie에서 기존 `pm_visitor_id` 조회
2. 없으면 `crypto.randomUUID()` 또는 난수 기반 ID 생성
3. 생성값 예: `v_01HX8J7N9K2Z...`
4. 보관 기간은 개인정보처리방침 고지 후 90일 또는 180일 권장

주의:

- 제3자 쿠키가 아닌 광고주 도메인 first-party 저장소를 사용합니다.
- 방문자 식별자는 개인을 직접 식별하지 않는 임의 ID여야 합니다.

## session_id 생성 방식

권장 방식:

1. sessionStorage에서 기존 `pm_session_id` 조회
2. 없으면 새 세션 ID 생성
3. 30분 이상 활동이 없으면 새 세션으로 간주
4. 생성값 예: `s_20260527_01HX8J7...`

## UTM/referrer 수집 방식

- 최초 랜딩 시 `location.search`에서 UTM 파라미터를 파싱합니다.
- `document.referrer`를 함께 전송합니다.
- 세션 중 페이지 이동 시 최초 UTM은 세션 속성으로 유지합니다.
- `gclid`, `fbclid`, `n_query`, `kakao_ad` 등 매체별 클릭 식별자도 확장 필드로 수집 가능합니다.

## 체류시간 측정 방식

- `init` 시점에 `performance.now()` 기준 시작 시간을 기록합니다.
- `visibilitychange`, `pagehide`, `beforeunload`에서 누적 체류시간을 전송합니다.
- 백그라운드 탭 시간은 제외하거나 별도 플래그로 기록합니다.
- 최소 전송 단위는 1초, 서버 저장은 초 단위 권장입니다.

## 페이지뷰 수집 방식

- 초기 로드 시 `page_view` 이벤트 전송
- SPA 라우팅은 History API 래핑 또는 framework hook으로 URL 변경 감지
- URL 변경 시 `POST /api/events`로 page_view 이벤트 전송

## 전환 이벤트 전송 방식

광고주 페이지에서 직접 호출할 수 있는 공개 API를 제공합니다.

```html
<script>
window.pmInvalidClick("conversion", {
  eventName: "lead_submit",
  value: 0,
  metadata: {
    form: "consult"
  }
});
</script>
```

전송 payload 예:

```json
{
  "client_id": "pm-shabu20",
  "visitor_id": "v_01HX...",
  "session_id": "s_01HX...",
  "event_type": "conversion",
  "event_name": "lead_submit",
  "value": 0,
  "url": "https://example.com/thanks",
  "occurred_at": "2026-05-27T14:40:00+09:00"
}
```

## 서버 미응답 시 fallback 정책

- `navigator.sendBeacon` 우선 사용, 실패 시 `fetch(..., { keepalive: true })` 사용
- 네트워크 실패 시 sessionStorage 큐에 최대 20건 보관
- 다음 페이지뷰 또는 재방문 시 재전송
- 24시간 이상 지난 이벤트는 폐기
- 중복 방지를 위해 event_id를 클라이언트에서 생성하고 서버에서 idempotency 처리
- SDK 로드 실패가 광고주 사이트 렌더링을 막지 않도록 비동기 로드만 사용
