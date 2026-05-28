"use client";

import AppShell from "@/components/AppShell";
import AdvertisersWorkspace from "@/components/AdvertisersWorkspace";

export default function AdvertiserCreatePage() {
  return (
    <AppShell title="광고주/사이트 등록" description="광고주 기본 정보와 사이트 URL을 등록하고 추적 키를 발급합니다.">
      <AdvertisersWorkspace defaultTab="create" />
    </AppShell>
  );
}
