import { useState } from "react";
import { Clipboard, Copy } from "lucide-react";
import { Card, SectionTitle, StatusBadge } from "@/components/ui";

const installedScripts = [
  { advertiser: "브랜드A", clientId: "pm-brand-a", status: "정상 수집", lastSeen: "2026-05-27 14:28:11" },
  { advertiser: "병원B", clientId: "pm-hospital-b", status: "오류", lastSeen: "2026-05-27 11:42:03" },
  { advertiser: "쇼핑몰C", clientId: "pm-shop-c", status: "정상 수집", lastSeen: "2026-05-27 14:21:38" },
  { advertiser: "교육D", clientId: "pm-edu-d", status: "설치 전", lastSeen: "-" },
  { advertiser: "금융E", clientId: "pm-finance-e", status: "정상 수집", lastSeen: "2026-05-27 14:17:55" }
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
    await navigator.clipboard.writeText(buildTrackingScript(clientId));
    setCopied(advertiser);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <Card id="scripts" className="no-print">
      <SectionTitle icon={Clipboard} title="광고주별 설치 스크립트" right={<span className="text-xs text-slate-500">서버 연동 전 데모 상태</span>} />
      <div className="border-b border-line bg-panelSoft/50 px-5 py-3 text-xs text-slate-400">
        현재 설치 상태와 최근 수집 시간은 더미 데이터입니다. 실제 서버 연동 시 수집 SDK 상태 API로 교체할 수 있도록 화면 구조만 준비했습니다.
      </div>
      {copied && (
        <div className="mx-5 mt-4 rounded-md border border-brand/25 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">
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
