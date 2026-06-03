"use client";

import { Download } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppState } from "@/components/AppStateProvider";
import { Card } from "@/components/ui";
import { downloadClickReportCsv } from "@/lib/exportCsv";
import { number } from "@/lib/format";

export default function ReportExportPage() {
  const { accessibleLogs, conversionEvents } = useAppState();

  return (
    <AppShell title="CSV 내보내기" description="필터된 클릭과 전환 기록을 운영 검토용 CSV 파일로 내려받습니다.">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="클릭 기록" value={accessibleLogs.length} />
        <Metric label="전환 기록" value={conversionEvents.length} />
        <Metric label="파일 형식" value="CSV" />
      </div>
      <Card className="p-5">
        <h2 className="text-sm font-bold text-white">내보내기</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          광고주명, 시간, IP, 방문 페이지, 유입 경로, 상태, 위험도, 판정 사유, 체류시간, 전환 여부를 포함합니다.
          내부 식별값은 기본 파일에 포함하지 않습니다.
        </p>
        <button
          type="button"
          onClick={() => downloadClickReportCsv(accessibleLogs, conversionEvents)}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-ink"
        >
          <Download size={16} />
          CSV 다운로드
        </button>
      </Card>
    </AppShell>
  );
}

function Metric({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <strong className="mt-2 block text-xl text-white">{typeof value === "number" ? number(value) : value}</strong>
    </Card>
  );
}
