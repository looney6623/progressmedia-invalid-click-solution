"use client";

import { Printer } from "lucide-react";
import AdvertiserReport from "@/components/AdvertiserReport";
import AppShell from "@/components/AppShell";
import { useAppState } from "@/components/AppStateProvider";

export default function PrintReportPage() {
  const { user, myAdvertisers, allAdvertisers, accessibleLogs, conversionEvents, manualBlocks, releasedBlocks } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  return (
    <AppShell
      title="인쇄용 리포트"
      description="광고주 리포트를 종이 출력이나 PDF 저장에 맞춰 확인합니다."
      actions={
        <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-ink">
          <Printer size={16} />
          인쇄
        </button>
      }
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
