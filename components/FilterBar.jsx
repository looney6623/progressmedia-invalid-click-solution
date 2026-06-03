import { Search } from "lucide-react";
import { Card } from "@/components/ui";

const mediaOptions = ["전체", "네이버 검색", "구글 검색", "메타", "카카오", "제휴 매체"];
const statusOptions = ["전체", "정상", "의심", "차단"];
const dateOptions = ["오늘", "최근 7일", "최근 30일"];

function optionValue(option) {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option) {
  return typeof option === "string" ? option : option.label;
}

function advertiserLabel(advertiser) {
  const suffix = advertiser.clientId || advertiser.projectKey || advertiser.id;
  return suffix ? `${advertiser.name} · ${suffix}` : advertiser.name;
}

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
          <option key={optionValue(option)} value={optionValue(option)}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FilterBar({ filters, setFilters, advertiserOptions }) {
  const advertisers = [
    { value: "전체", label: "전체" },
    ...advertiserOptions.map((item) => ({ value: item.id || item.name, label: advertiserLabel(item) }))
  ];

  return (
    <Card className="p-5 no-print">
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">검색/필터</p>
        <p className="mt-1 text-xs text-slate-500">광고주, 날짜, 상태, 유입경로, IP, 키워드를 기준으로 현재 화면 데이터를 좁혀 봅니다.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr]">
        <FilterSelect label="광고주" value={filters.advertiser} onChange={(advertiser) => setFilters((prev) => ({ ...prev, advertiser }))} options={advertisers} />
        <FilterSelect label="매체/유입경로" value={filters.media} onChange={(media) => setFilters((prev) => ({ ...prev, media }))} options={mediaOptions} />
        <FilterSelect label="상태" value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} options={statusOptions} />
        <FilterSelect label="날짜 범위" value={filters.dateRange} onChange={(dateRange) => setFilters((prev) => ({ ...prev, dateRange }))} options={dateOptions} />
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">IP/키워드 검색</span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-line bg-ink px-3 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              placeholder="IP, 광고주명, referrer, UTM, 키워드"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
            />
          </span>
        </label>
      </div>
    </Card>
  );
}
