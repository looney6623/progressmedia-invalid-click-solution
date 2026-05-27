import { Search } from "lucide-react";
import { Card } from "@/components/ui";

const mediaOptions = ["전체", "네이버 검색", "구글 검색", "메타", "카카오", "제휴 매체"];
const statusOptions = ["전체", "정상", "의심", "차단"];
const dateOptions = ["오늘", "최근 7일", "최근 30일"];

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FilterBar({ filters, setFilters, advertiserOptions }) {
  const advertisers = ["전체", ...advertiserOptions.map((item) => item.name)];

  return (
    <Card className="p-5 no-print">
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">통합 필터</p>
        <p className="mt-1 text-xs text-slate-500">선택한 조건은 KPI, 차트, 로그, 리포트에 함께 반영됩니다.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr]">
        <FilterSelect label="광고주" value={filters.advertiser} onChange={(advertiser) => setFilters((prev) => ({ ...prev, advertiser }))} options={advertisers} />
        <FilterSelect label="매체" value={filters.media} onChange={(media) => setFilters((prev) => ({ ...prev, media }))} options={mediaOptions} />
        <FilterSelect label="상태" value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} options={statusOptions} />
        <FilterSelect label="날짜" value={filters.dateRange} onChange={(dateRange) => setFilters((prev) => ({ ...prev, dateRange }))} options={dateOptions} />
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">검색</span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-line bg-ink px-3 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              placeholder="IP, 광고주명, 매체명, 판정 사유"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
            />
          </span>
        </label>
      </div>
    </Card>
  );
}
