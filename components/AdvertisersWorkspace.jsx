"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Code2, UsersRound } from "lucide-react";
import AdvertiserCreatePanel from "@/components/AdvertiserCreatePanel";
import AdvertiserUserManagement from "@/components/AdvertiserUserManagement";
import InstallScriptPanel from "@/components/InstallScriptPanel";
import { Card, StatusBadge } from "@/components/ui";
import { number } from "@/lib/format";
import { useAppState } from "@/components/AppStateProvider";

const tabs = [
  { id: "list", label: "광고주 목록" },
  { id: "create", label: "광고주 생성" },
  { id: "users", label: "광고주 계정 관리" },
  { id: "scripts", label: "설치 스크립트" }
];

export default function AdvertisersWorkspace() {
  const {
    user,
    myAdvertisers,
    allAdvertisers,
    advertiserUsers,
    handleCreateAdvertiser,
    handleCreateAdvertiserUser,
    handleUpdateAdvertiserUserPermission,
    handleDeactivateAdvertiserUser
  } = useAppState();
  const [activeTab, setActiveTab] = useState("list");
  const advertisers = user.role === "admin" ? allAdvertisers : myAdvertisers;

  const summary = useMemo(() => {
    const active = advertisers.filter((item) => item.status === "active").length;
    const installed = advertisers.filter((item) => item.projectKey && item.clientId).length;
    const advertiserIds = advertisers.map((item) => item.id);
    const users = advertiserUsers.filter((item) => advertiserIds.includes(item.advertiserId)).length;
    return { total: advertisers.length, active, installed, users };
  }, [advertiserUsers, advertisers]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Building2} label="내 광고주 수" value={summary.total} />
        <SummaryCard icon={CheckCircle2} label="활성 광고주 수" value={summary.active} />
        <SummaryCard icon={Code2} label="설치 완료 수" value={summary.installed} />
        <SummaryCard icon={UsersRound} label="광고주 계정 수" value={summary.users} />
      </div>

      <Card className="p-2 no-print">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-brand text-ink" : "text-slate-400 hover:bg-panelSoft hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {activeTab === "list" && <AdvertiserList advertisers={advertisers} />}
      {activeTab === "create" && <AdvertiserCreatePanel currentUser={user} onCreateAdvertiser={handleCreateAdvertiser} />}
      {activeTab === "users" && (
        <AdvertiserUserManagement
          advertiserUsers={advertiserUsers}
          advertisers={advertisers}
          onCreateUser={handleCreateAdvertiserUser}
          onUpdatePermission={handleUpdateAdvertiserUserPermission}
          onDeactivateUser={handleDeactivateAdvertiserUser}
        />
      )}
      {activeTab === "scripts" && <InstallScriptPanel advertisers={advertisers} />}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <Icon size={18} className="text-brand" />
      </div>
      <strong className="mt-3 block text-2xl text-white">{number(value)}</strong>
    </Card>
  );
}

function AdvertiserList({ advertisers }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-bold text-white">광고주 목록</h2>
        <p className="mt-1 text-sm text-slate-500">현재 계정 권한으로 접근 가능한 광고주입니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
              {["광고주", "사이트 URL", "client_id", "project_key", "상태"].map((head) => (
                <th key={head} className="px-5 py-3 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {advertisers.map((advertiser) => (
              <tr key={advertiser.id} className="hover:bg-panelSoft/50">
                <td className="px-5 py-4 font-semibold text-white">{advertiser.name}</td>
                <td className="px-5 py-4 text-slate-400">{advertiser.siteUrl}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-300">{advertiser.clientId}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-300">{advertiser.projectKey}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={advertiser.status === "active" ? "정상" : "설치 전"} label={advertiser.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {advertisers.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">관리 중인 광고주가 없습니다.</div>}
      </div>
    </Card>
  );
}
