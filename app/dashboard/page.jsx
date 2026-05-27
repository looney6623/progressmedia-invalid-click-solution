"use client";

import AdvertiserChart from "@/components/AdvertiserChart";
import AppShell from "@/components/AppShell";
import ClickStatusChart from "@/components/ClickStatusChart";
import ClickTrendChart from "@/components/ClickTrendChart";
import FilterBar from "@/components/FilterBar";
import KpiCards from "@/components/KpiCards";
import MediaChart from "@/components/MediaChart";
import { useAppState } from "@/components/AppStateProvider";

export default function DashboardPage() {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, summary, hourlyTrend, advertiserStats, mediaStats } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  return (
    <AppShell title="대시보드" description="접근 가능한 광고주의 클릭 현황과 무효클릭 위험 신호를 한눈에 확인합니다.">
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      <KpiCards summary={summary} />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <ClickTrendChart data={hourlyTrend} />
        <ClickStatusChart summary={summary} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AdvertiserChart data={advertiserStats} />
        <MediaChart data={mediaStats} />
      </div>
    </AppShell>
  );
}
