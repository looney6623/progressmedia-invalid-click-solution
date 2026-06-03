"use client";

import AppShell from "@/components/AppShell";
import BlockManagement from "@/components/BlockManagement";
import { useAppState } from "@/components/AppStateProvider";

export default function BlockWorkspace({ mode = "manual" }) {
  const { myAdvertisers, manualBlocks, releasedBlocks, blockRules, blockedLogs, suspiciousLogs, addManualBlock, removeManualBlock, handleUpdateBlockRule, handleUpdateAdvertiserBlocking, handleUpdateClickLogStatus, refreshAccess } = useAppState();
  const title = mode === "rules" ? "자동 차단 규칙" : mode === "history" ? "차단 해제 이력" : "수동 차단 IP";
  const description = mode === "rules"
    ? "반복 클릭, 체류시간, 페이지 이동 기준의 자동 판정 정책을 관리합니다."
    : mode === "history"
      ? "차단을 해제한 이력을 확인합니다."
      : "현재 차단 중인 IP와 수동 차단 등록을 관리합니다.";

  return (
    <AppShell title={title} description={description}>
      <BlockManagement
        advertisers={myAdvertisers}
        manualBlocks={manualBlocks}
        releasedBlocks={releasedBlocks}
        blockRules={blockRules}
        blockedLogs={blockedLogs}
        suspiciousLogs={suspiciousLogs}
        onAddBlock={addManualBlock}
        onRemoveBlock={removeManualBlock}
        onUpdateRule={handleUpdateBlockRule}
        onUpdateAdvertiserBlocking={handleUpdateAdvertiserBlocking}
        onUpdateLogStatus={handleUpdateClickLogStatus}
        onRefresh={() => refreshAccess()}
        defaultTab={mode === "rules" ? "rules" : mode === "history" ? "history" : "manual"}
      />
    </AppShell>
  );
}
