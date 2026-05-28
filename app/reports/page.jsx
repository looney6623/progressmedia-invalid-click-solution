"use client";

import AdvertiserReport from "@/components/AdvertiserReport";
import AppShell from "@/components/AppShell";
import { useAppState } from "@/components/AppStateProvider";

export default function ReportsPage() {
  const { user, myAdvertisers, allAdvertisers, accessibleLogs, conversionEvents, manualBlocks, releasedBlocks } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  return (
    <AppShell
      title="광고주 리포트"
      description="권한 범위 내 Supabase 운영 데이터를 기준으로 광고주별 클릭, 차단, 전환, 절감 효과를 리포팅합니다."
    >
      <AdvertiserReport
        advertisers={advertisers}
        logs={accessibleLogs}
        conversionEvents={conversionEvents}
        manualBlocks={manualBlocks}
        releasedBlocks={releasedBlocks}
        allowAll={user?.role !== "advertiser"}
      />
    </AppShell>
  );
}
