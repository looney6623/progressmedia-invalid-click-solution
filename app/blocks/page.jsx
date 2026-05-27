"use client";

import AppShell from "@/components/AppShell";
import BlockManagement from "@/components/BlockManagement";
import { useAppState } from "@/components/AppStateProvider";

export default function BlocksPage() {
  const { myAdvertisers, manualBlocks, blockedLogs, suspiciousLogs, addManualBlock, removeManualBlock, refreshAccess } = useAppState();

  return (
    <AppShell title="차단 관리" description="자동 판정 로그와 수동 차단 IP를 실제 DB 기준으로 관리합니다.">
      <BlockManagement
        advertisers={myAdvertisers}
        manualBlocks={manualBlocks}
        blockedLogs={blockedLogs}
        suspiciousLogs={suspiciousLogs}
        onAddBlock={addManualBlock}
        onRemoveBlock={removeManualBlock}
        onRefresh={() => refreshAccess()}
      />
    </AppShell>
  );
}
