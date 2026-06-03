import { useState } from "react";
import { AlertCircle, CheckCircle2, Clipboard, Code2, Copy } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";
import { generateInstallScript } from "@/services/clickService";

const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_URL || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/pm-click-shield.js` : "/pm-click-shield.js");
const utmExample = "?utm_source=naver&utm_medium=cpc&utm_campaign=test_campaign&utm_term=invalid-click-test";

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
    if (!item.clientId || !item.projectKey) return;
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
      <SectionTitle icon={Clipboard} title="광고주별 설치 스크립트" right={<span className="text-xs text-slate-500">운영 추적 URL: {trackerUrl}</span>} />
      <SectionDescription>
        광고주 홈페이지에 삽입할 실제 운영용 추적 스크립트입니다. `NEXT_PUBLIC_TRACKER_URL`이 있으면 해당 값을 사용하고, 없으면 `NEXT_PUBLIC_APP_URL/pm-click-shield.js`를 사용합니다.
      </SectionDescription>

      <div className="grid gap-3 border-b border-line p-5 md:grid-cols-3">
        {[
          ["1", "테스트 페이지 1개에 먼저 삽입", "전체 사이트 적용 전 특정 테스트 페이지에 먼저 설치하고 사이트 깨짐 여부를 확인합니다."],
          ["2", "하단 스크립트 영역에 삽입", "일반 HTML은 </body> 바로 위, 카페24/아임웹/워드프레스는 공통 하단 스크립트 또는 Footer Script 영역에 삽입합니다."],
          ["3", "수집 여부 확인", "테스트 URL로 접속한 뒤 대시보드에 방문 기록이 보이는지 확인합니다."]
        ].map(([step, title, body]) => (
          <div key={step} className="rounded-md border border-line bg-panelSoft p-4">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand text-xs font-bold text-ink">{step}</span>
            <p className="mt-3 text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 border-b border-line p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Code2 size={16} className="text-brand" />
            설치 코드 예시
          </div>
          <pre className="overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">
{`<script
  async
  src="${trackerUrl}"
  data-client-id="광고주 고객 코드"
  data-project-key="광고주 설치 키">
</script>`}
          </pre>
        </div>
        <div className="rounded-md border border-line bg-panelSoft p-4">
          <p className="text-sm font-semibold text-white">UTM 테스트 URL</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">설치 후 광고주 테스트 페이지 URL 뒤에 아래 파라미터를 붙여 접속합니다.</p>
          <code className="mt-3 block break-all rounded bg-ink p-3 text-xs text-brand">{utmExample}</code>
          <p className="mt-3 text-xs leading-5 text-slate-500">접속 후 5초 이상 머물렀다가 페이지를 닫거나 이동하면 체류시간이 전송됩니다.</p>
        </div>
      </div>

      {copied && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-md border border-brand/25 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">
          <CheckCircle2 size={16} />
          {copied} 설치 스크립트를 복사했습니다.
        </div>
      )}

      <div className="divide-y divide-line">
        {scripts.map((item) => {
          const installable = Boolean(item.clientId && item.projectKey);
          return (
            <div key={`${item.advertiser}-${item.clientId || "missing"}`} className="grid gap-4 px-5 py-5 xl:grid-cols-[0.65fr_1.4fr_0.45fr_0.55fr] xl:items-center">
              <div>
                <p className="text-sm font-semibold text-white">{item.advertiser}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{item.clientId || "고객 코드 없음"}</p>
                <p className="mt-1 font-mono text-xs text-slate-600">{item.projectKey || "설치 키 없음"}</p>
              </div>
              {installable ? (
                <pre className="max-h-36 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">
                  {generateInstallScript(item.clientId, item.projectKey)}
                </pre>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
                  <AlertCircle size={16} />
                  설치 코드 발급 정보가 없어 설치할 수 없습니다. 광고주 정보를 다시 발급해 주세요.
                </div>
              )}
              <StatusBadge status={item.status} label={installable ? item.status : "설치 불가"} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">최근 수집 {item.lastSeen}</span>
                <button
                  onClick={() => copyScript(item)}
                  disabled={!installable}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy size={14} />
                  {copied === item.advertiser ? "복사 완료" : "복사"}
                </button>
              </div>
            </div>
          );
        })}
        {scripts.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            설치 스크립트를 표시할 광고주가 없습니다. 광고주를 먼저 생성하면 설치 코드가 발급됩니다.
          </div>
        )}
      </div>
    </Card>
  );
}
