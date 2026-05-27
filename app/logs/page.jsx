"use client";

import AppShell from "@/components/AppShell";
import ClickLogTable from "@/components/ClickLogTable";
import FilterBar from "@/components/FilterBar";
import { useAppState } from "@/components/AppStateProvider";

export default function LogsPage() {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  return (
    <AppShell title="실시간 클릭 로그" description="필터 조건에 맞는 클릭 로그를 위험도와 판정 사유 중심으로 확인합니다.">
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      <ClickLogTable logs={filteredLogs} />
    </AppShell>
  );
}
