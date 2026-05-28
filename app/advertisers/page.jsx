"use client";

import { Suspense } from "react";
import AdvertisersWorkspace from "@/components/AdvertisersWorkspace";
import AppShell from "@/components/AppShell";

export default function AdvertisersPage() {
  return (
    <AppShell title="광고주 관리" description="광고주 목록, 광고주/사이트 등록, 로그인 계정 발급, 설치 스크립트를 단계별로 관리합니다.">
      <Suspense fallback={<div className="min-h-40" />}>
        <AdvertisersWorkspace />
      </Suspense>
    </AppShell>
  );
}
