"use client";

import AdvertiserChart from "@/components/AdvertiserChart";
import AppShell from "@/components/AppShell";
import ClickStatusChart from "@/components/ClickStatusChart";
import ClickTrendChart from "@/components/ClickTrendChart";
import FilterBar from "@/components/FilterBar";
import MediaChart from "@/components/MediaChart";
import { useAppState } from "@/components/AppStateProvider";

export default function AnalysisPage() {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, summary, hourlyTrend, advertiserStats, mediaStats } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  return (
    <AppShell title="무효클릭 분석" description="광고주, 매체, 시간대별로 의심 클릭과 차단 패턴을 분석합니다.">
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
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
