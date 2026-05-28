"use client";

import AppShell from "@/components/AppShell";
import AdvertisersWorkspace from "@/components/AdvertisersWorkspace";

export default function AdvertiserAccountsPage() {
  return (
    <AppShell title="광고주 로그인 계정 발급" description="등록된 광고주에 로그인 계정을 연결하고 권한을 관리합니다.">
      <AdvertisersWorkspace defaultTab="users" />
    </AppShell>
  );
}
