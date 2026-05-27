"use client";

import { Download } from "lucide-react";
import AdvertiserReport from "@/components/AdvertiserReport";
import AppShell from "@/components/AppShell";
import FilterBar from "@/components/FilterBar";
import { useAppState } from "@/components/AppStateProvider";
import { downloadClickReportCsv } from "@/lib/exportCsv";

export default function ReportsPage() {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs, advertiserStats } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  return (
    <AppShell
      title="광고주 리포트"
      description="필터링된 데이터를 기준으로 광고주별 상세 리포트를 확인하고 출력합니다."
      actions={
        <button onClick={() => downloadClickReportCsv(filteredLogs)} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-ink">
          <Download size={14} />
          CSV 내보내기
        </button>
      }
    >
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      <AdvertiserReport advertiserStats={advertiserStats} logs={filteredLogs} />
    </AppShell>
  );
}
