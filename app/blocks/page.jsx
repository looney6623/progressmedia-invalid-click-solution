"use client";

import AppShell from "@/components/AppShell";
import BlockManagement from "@/components/BlockManagement";
import { useAppState } from "@/components/AppStateProvider";

export default function BlocksPage() {
  const { manualBlocks, blockedLogs, addManualBlock, removeManualBlock } = useAppState();

  return (
    <AppShell title="차단 관리" description="자동 판정 규칙과 수동 차단 IP를 함께 관리합니다.">
      <BlockManagement manualBlocks={manualBlocks} blockedLogs={blockedLogs} onAddBlock={addManualBlock} onRemoveBlock={removeManualBlock} />
    </AppShell>
  );
}
