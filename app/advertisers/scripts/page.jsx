"use client";

import AppShell from "@/components/AppShell";
import AdvertisersWorkspace from "@/components/AdvertisersWorkspace";

export default function AdvertiserScriptsPage() {
  return (
    <AppShell title="설치 스크립트" description="광고주별 고객 코드와 설치 키가 포함된 추적 스크립트를 확인하고 복사합니다.">
      <AdvertisersWorkspace defaultTab="scripts" />
    </AppShell>
  );
}
