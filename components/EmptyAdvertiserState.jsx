"use client";

import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Card } from "@/components/ui";

export default function EmptyAdvertiserState({ compact = false }) {
  return (
    <Card className={compact ? "p-5" : "p-6"}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
            <Building2 size={21} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">아직 등록된 광고주가 없습니다.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              광고주를 생성하고 사이트 URL과 광고주 계정을 등록하면 무효클릭 분석을 시작할 수 있습니다.
            </p>
          </div>
        </div>
        <Link
          href="/advertisers?tab=create"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink transition hover:bg-brand/90"
        >
          <Plus size={16} />
          광고주 생성하기
        </Link>
      </div>
    </Card>
  );
}
