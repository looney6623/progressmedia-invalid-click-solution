"use client";

import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function PolicyPage() {
  return (
    <AppShell title="운영 정책" description="무효클릭 판정, 개인정보 보호, 로그 보관 기준을 운영자가 확인하는 설정 화면입니다.">
      <Card className="p-5">
        <h2 className="text-sm font-bold text-white">기본 운영 정책</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            ["반복 클릭", "10분 내 3회 의심, 5회 차단"],
            ["체류시간", "3초 이하 위험도 가중"],
            ["페이지 이동", "0회이면 위험도 가중"],
            ["IP 저장", "원문 저장 금지, ip_hash/ip_masked 사용"],
            ["차단 해제", "삭제가 아닌 soft release 처리"],
            ["로그 보관", "기본 90일 정책"]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-line bg-panelSoft p-4">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-sm text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
