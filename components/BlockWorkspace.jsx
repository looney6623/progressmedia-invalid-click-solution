"use client";

import AppShell from "@/components/AppShell";
import BlockManagement from "@/components/BlockManagement";
import { useAppState } from "@/components/AppStateProvider";

const modeConfig = {
  rules: {
    title: "자동 차단 규칙",
    description: "반복 클릭, 짧은 체류, 페이지 이동 같은 자동 판정 기준과 광고주별 긴급 중지를 관리합니다.",
    defaultTab: "rules",
    allowedTabs: ["rules"]
  },
  manual: {
    title: "수동 차단 IP",
    description: "현재 실제로 차단 중인 IP를 확인하고, 필요한 경우 직접 차단하거나 해제합니다.",
    defaultTab: "active",
    allowedTabs: ["active"]
  },
  history: {
    title: "차단 해제 이력",
    description: "과거에 차단됐다가 해제된 IP와 해제 시점을 확인합니다.",
    defaultTab: "history",
    allowedTabs: ["history"]
  }
};

export default function BlockWorkspace({ mode = "manual" }) {
  const {
    myAdvertisers,
    manualBlocks,
    releasedBlocks,
    blockRules,
    blockedLogs,
    suspiciousLogs,
    addManualBlock,
    removeManualBlock,
    handleUpdateBlockRule,
    handleUpdateAdvertiserBlocking,
    handleUpdateClickLogStatus,
    refreshAccess
  } = useAppState();
  const config = modeConfig[mode] || modeConfig.manual;

  return (
    <AppShell title={config.title} description={config.description}>
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
        defaultTab={config.defaultTab}
        allowedTabs={config.allowedTabs}
      />
    </AppShell>
  );
}
