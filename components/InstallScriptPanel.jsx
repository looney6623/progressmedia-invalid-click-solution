import { useState } from "react";
import { CheckCircle2, Clipboard, Code2, Copy } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";

const installedScripts = [
  { advertiser: "샤브20", clientId: "pm-shabu20", status: "정상 수집", lastSeen: "2026-05-27 14:28:11" },
  { advertiser: "3분페이", clientId: "pm-3minpay", status: "정상 수집", lastSeen: "2026-05-27 14:17:55" },
  { advertiser: "대주바이오", clientId: "pm-daejoo-bio", status: "설치 전", lastSeen: "-" },
  { advertiser: "바른숨병원", clientId: "pm-hospital", status: "오류", lastSeen: "2026-05-27 11:42:03" },
  { advertiser: "온리원쇼핑몰", clientId: "pm-onlyone-shop", status: "정상 수집", lastSeen: "2026-05-27 14:21:38" }
];

function buildTrackingScript(clientId) {
  return `<script>
(function(w,d,s,u,c){
  w.pmInvalidClick=w.pmInvalidClick||function(){(w.pmInvalidClick.q=w.pmInvalidClick.q||[]).push(arguments)};
  w.pmInvalidClick("init",{clientId:c});
  var js=d.createElement(s); js.async=true; js.src=u;
  d.head.appendChild(js);
})(window,document,"script","https://cdn.progressmedia.co.kr/invalid-click.js","${clientId}");
</script>`;
}

export default function InstallScriptPanel() {
  const [copied, setCopied] = useState("");

  async function copyScript(clientId, advertiser) {
    try {
      await navigator.clipboard.writeText(buildTrackingScript(clientId));
    } catch {
      // 데모 환경에서 클립보드 권한이 제한되어도 사용자는 복사 시도를 확인할 수 있어야 합니다.
    }
    setCopied(advertiser);
    window.setTimeout(() => setCopied(""), 2200);
  }

  return (
    <Card id="scripts" className="no-print">
      <SectionTitle icon={Clipboard} title="광고주별 설치 스크립트" right={<span className="text-xs text-slate-500">예시 스크립트</span>} />
      <SectionDescription>
        현재는 서버 미연동 데모이므로 아래 스크립트와 설치 상태는 예시입니다. 실제 연동 시 광고주별 clientId와 수집 상태 API로 교체됩니다.
      </SectionDescription>

      <div className="grid gap-3 border-b border-line p-5 md:grid-cols-3">
        {[
          ["1", "광고주 선택", "설치할 광고주의 clientId가 포함된 스크립트를 복사합니다."],
          ["2", "Head 태그 삽입", "광고주 랜딩 페이지의 </head> 직전 또는 공통 head 영역에 붙여넣습니다."],
          ["3", "수집 상태 확인", "방문 테스트 후 정상 수집 또는 오류 상태를 확인합니다."]
        ].map(([step, title, body]) => (
          <div key={step} className="rounded-md border border-line bg-panelSoft p-4">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand text-xs font-bold text-ink">{step}</span>
            <p className="mt-3 text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-line px-5 py-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Code2 size={16} className="text-brand" />
          Head 태그 삽입 예시
        </div>
        <pre className="overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">
{`<head>
  <title>광고주 랜딩 페이지</title>
  <!-- ProgressMedia invalid click tracking script -->
  ${buildTrackingScript("pm-example-client").replaceAll("\n", "\n  ")}
</head>`}
        </pre>
      </div>

      {copied && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-md border border-brand/25 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">
          <CheckCircle2 size={16} />
          {copied} 설치 스크립트를 클립보드에 복사했습니다.
        </div>
      )}
      <div className="divide-y divide-line">
        {installedScripts.map((item) => (
          <div key={item.clientId} className="grid gap-4 px-5 py-5 xl:grid-cols-[0.65fr_1.4fr_0.45fr_0.55fr] xl:items-center">
            <div>
              <p className="text-sm font-semibold text-white">{item.advertiser}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{item.clientId}</p>
            </div>
            <pre className="max-h-24 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">
              {buildTrackingScript(item.clientId)}
            </pre>
            <StatusBadge status={item.status} label={item.status} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">최근 수집 {item.lastSeen}</span>
              <button
                onClick={() => copyScript(item.clientId, item.advertiser)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <Copy size={14} />
                {copied === item.advertiser ? "복사 완료" : "복사"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
