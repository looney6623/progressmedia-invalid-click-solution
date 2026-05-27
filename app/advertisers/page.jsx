"use client";

import { Suspense } from "react";
import AdvertisersWorkspace from "@/components/AdvertisersWorkspace";
import AppShell from "@/components/AppShell";

export default function AdvertisersPage() {
  return (
    <AppShell title="광고주 관리" description="광고주 목록, 신규 생성, 광고주 계정, 설치 스크립트를 한 화면에서 관리합니다.">
      <Suspense fallback={<div className="min-h-40" />}>
        <AdvertisersWorkspace />
      </Suspense>
    </AppShell>
  );
}
