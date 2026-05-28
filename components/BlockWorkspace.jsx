"use client";

import AppShell from "@/components/AppShell";
import BlockManagement from "@/components/BlockManagement";
import { Card, SectionDescription, SectionTitle } from "@/components/ui";
import { useAppState } from "@/components/AppStateProvider";
import { SlidersHorizontal } from "lucide-react";

export default function BlockWorkspace({ mode = "manual" }) {
  const { myAdvertisers, manualBlocks, blockedLogs, suspiciousLogs, addManualBlock, removeManualBlock, refreshAccess } = useAppState();
  const title = mode === "rules" ? "자동 차단 규칙" : mode === "history" ? "차단 해제 이력" : "수동 차단 IP";
  const description = mode === "rules"
    ? "반복 클릭, 체류시간, 페이지 이동 기준의 서버 판정 정책을 확인합니다."
    : mode === "history"
      ? "pm_blocked_ips의 soft release 기준으로 차단 해제 이력을 확인합니다."
      : "pm_blocked_ips 활성 차단 목록과 수집 로그 기반 수동 차단 등록을 관리합니다.";

  return (
    <AppShell title={title} description={description}>
      {mode === "history" && (
        <Card>
          <SectionTitle icon={SlidersHorizontal} title="차단 해제 이력" />
          <SectionDescription>해제된 차단은 `is_active=false` 또는 `released_at` 값이 있는 row입니다. 현재 화면은 운영 DB 연동 구조를 기준으로 안내하며, 활성 차단 관리는 수동 차단 IP 메뉴에서 처리합니다.</SectionDescription>
          <div className="px-5 py-10 text-center text-sm text-slate-500">해제 이력 전용 조회 API를 연결하면 이 영역에 `pm_blocked_ips` release 이력이 표시됩니다.</div>
        </Card>
      )}
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
