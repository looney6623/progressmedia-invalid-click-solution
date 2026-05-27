import { useState } from "react";
import { CheckCircle2, Clipboard, Code2, Copy } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";
import { generateInstallScript } from "@/services/clickService";

const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_URL || "/pm-click-shield.js";

export default function InstallScriptPanel({ advertisers = [] }) {
  const [copied, setCopied] = useState("");
  const scripts = advertisers.map((advertiser) => ({
    advertiser: advertiser.name,
    clientId: advertiser.clientId,
    projectKey: advertiser.projectKey,
    status: advertiser.status === "active" ? "정상 수집" : "설치 전",
    lastSeen: advertiser.status === "active" ? "수집 대기" : "-"
  }));

  async function copyScript(item) {
    const script = generateInstallScript(item.clientId, item.projectKey);
    try {
      await navigator.clipboard.writeText(script);
    } catch {
      // Clipboard permission can be unavailable in some browsers.
    }
    setCopied(item.advertiser);
    window.setTimeout(() => setCopied(""), 2200);
  }

  return (
    <Card id="scripts" className="no-print">
      <SectionTitle icon={Clipboard} title="광고주별 설치 스크립트" right={<span className="text-xs text-slate-500">권한 범위 내 광고주</span>} />
      <SectionDescription>
        광고주 사이트의 head 태그에 설치할 추적 스크립트입니다. `NEXT_PUBLIC_TRACKER_URL`이 설정되어 있으면 해당 배포 URL을 사용합니다.
      </SectionDescription>

      <div className="grid gap-3 border-b border-line p-5 md:grid-cols-3">
        {[
          ["1", "광고주 선택", "접근 권한이 있는 광고주의 client_id와 project_key가 포함된 스크립트를 복사합니다."],
          ["2", "Head 태그 삽입", "광고주 사이트의 공통 head 영역 또는 랜딩 페이지 </head> 직전에 붙여 넣습니다."],
          ["3", "수집 상태 확인", "테스트 페이지 접속 후 /api/collect 저장 여부와 대시보드 로그를 확인합니다."]
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
  <script
    async
    src="${trackerUrl}"
    data-client-id="광고주 client_id"
    data-project-key="광고주 project_key">
  </script>
</head>`}
        </pre>
      </div>

      {copied && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-md border border-brand/25 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">
          <CheckCircle2 size={16} />
          {copied} 설치 스크립트를 복사했습니다.
        </div>
      )}
      <div className="divide-y divide-line">
        {scripts.map((item) => (
          <div key={item.clientId} className="grid gap-4 px-5 py-5 xl:grid-cols-[0.65fr_1.4fr_0.45fr_0.55fr] xl:items-center">
            <div>
              <p className="text-sm font-semibold text-white">{item.advertiser}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{item.clientId}</p>
              <p className="mt-1 font-mono text-xs text-slate-600">{item.projectKey}</p>
            </div>
            <pre className="max-h-24 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">
              {generateInstallScript(item.clientId, item.projectKey)}
            </pre>
            <StatusBadge status={item.status} label={item.status} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">최근 수집 {item.lastSeen}</span>
              <button
                onClick={() => copyScript(item)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <Copy size={14} />
                {copied === item.advertiser ? "복사 완료" : "복사"}
              </button>
            </div>
          </div>
        ))}
        {scripts.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">설치 스크립트를 표시할 광고주가 없습니다.</div>}
      </div>
    </Card>
  );
}
