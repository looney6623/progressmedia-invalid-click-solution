"use client";

import AppShell from "@/components/AppShell";
import AdvertisersWorkspace from "@/components/AdvertisersWorkspace";

export default function AdvertiserScriptsPage() {
  return (
    <AppShell title="설치 스크립트" description="광고주별 client_id, project_key가 포함된 추적 스크립트를 확인하고 복사합니다.">
      <AdvertisersWorkspace defaultTab="scripts" />
    </AppShell>
  );
}
