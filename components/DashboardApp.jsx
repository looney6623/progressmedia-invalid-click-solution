"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import AdminManagement from "@/components/AdminManagement";
import AdvertiserChart from "@/components/AdvertiserChart";
import AdvertiserCreatePanel from "@/components/AdvertiserCreatePanel";
import AdvertiserReport from "@/components/AdvertiserReport";
import AdvertiserUserManagement from "@/components/AdvertiserUserManagement";
import BlockManagement from "@/components/BlockManagement";
import ClickLogTable from "@/components/ClickLogTable";
import ClickStatusChart from "@/components/ClickStatusChart";
import ClickTrendChart from "@/components/ClickTrendChart";
import FilterBar from "@/components/FilterBar";
import InstallScriptPanel from "@/components/InstallScriptPanel";
import KpiCards from "@/components/KpiCards";
import LoginPage from "@/components/LoginPage";
import MediaChart from "@/components/MediaChart";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui";
import {
  clickLogs,
  getAdvertiserStats,
  getHourlyTrend,
  getMediaStats,
  summarizeClicks
} from "@/lib/clickData";
import { downloadClickReportCsv } from "@/lib/exportCsv";
import { enrichWithManualBlocks, filterClicks } from "@/lib/filterClicks";
import {
  assignAdvertiserToMarketer,
  createAdvertiserUser,
  createAdvertiserWithAccount,
  deactivateAdvertiserUser,
  fetchAdvertiserAssignments,
  fetchAdvertiserUsers,
  fetchCurrentUser,
  fetchMyAccessibleAdvertisers,
  fetchTeamMembers,
  mockAdvertisers,
  removeAdvertiserAssignment,
  signInWithEmail,
  signOut,
  updateAdvertiserUserPermission
} from "@/services/clickService";

const initialManualBlocks = [
  { ip: "211.44.18.91", reason: "샤브20 브랜드 키워드 반복 클릭", createdAt: "2026-05-27 14:29", method: "수동 차단" },
  { ip: "59.9.104.201", reason: "3분페이 제휴 매체 저품질 유입", createdAt: "2026-05-27 14:12", method: "수동 차단" }
];

function SectionLead({ title, children }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold text-brand">SECTION</p>
      <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{children}</p>
    </Card>
  );
}

function EmptyAssignment({ user, onSignOut }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 text-slate-200">
      <Card className="max-w-lg p-6 text-center">
        <p className="text-xs font-semibold text-brand">NO ADVERTISER ASSIGNED</p>
        <h1 className="mt-2 text-xl font-bold text-white">접근 가능한 광고주가 없습니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {user.name} 계정에는 아직 광고주가 연결되지 않았습니다. 관리자 또는 담당 마케터에게 계정 연결을 요청해 주세요.
        </p>
        <button onClick={onSignOut} className="mt-5 rounded-md border border-line bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-300">
          로그아웃
        </button>
      </Card>
    </main>
  );
}

export default function DashboardApp() {
  const [authReady, setAuthReady] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [myAdvertisers, setMyAdvertisers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [advertiserUsers, setAdvertiserUsers] = useState([]);
  const [filters, setFilters] = useState({
    advertiser: "전체",
    media: "전체",
    status: "전체",
    dateRange: "오늘",
    query: ""
  });
  const [manualBlocks, setManualBlocks] = useState(initialManualBlocks);
  const [activeSection, setActiveSection] = useState("dashboard");

  async function loadAuthContext(nextUser) {
    if (!nextUser) {
      setUser(null);
      setMyAdvertisers([]);
      setTeamMembers([]);
      setAssignments([]);
      setAdvertiserUsers([]);
      return;
    }
    const [advertiserResult, memberResult, assignmentResult, advertiserUserResult] = await Promise.all([
      fetchMyAccessibleAdvertisers(nextUser),
      nextUser.role === "admin" ? fetchTeamMembers() : Promise.resolve({ items: [] }),
      nextUser.role === "admin" ? fetchAdvertiserAssignments() : Promise.resolve({ items: [] }),
      nextUser.role !== "advertiser" ? fetchAdvertiserUsers(nextUser) : Promise.resolve({ items: [] })
    ]);
    setUser(nextUser);
    setMyAdvertisers(advertiserResult.items);
    setTeamMembers(memberResult.items);
    setAssignments(assignmentResult.items);
    setAdvertiserUsers(advertiserUserResult.items);
    setFilters((prev) => ({ ...prev, advertiser: "전체" }));
  }

  useEffect(() => {
    let active = true;
    fetchCurrentUser().then(async (currentUser) => {
      if (!active) return;
      await loadAuthContext(currentUser);
      setAuthReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const idsByRole = {
      admin: ["dashboard", "team", "assignments", "logs", "reports"],
      marketer: ["dashboard", "advertiser-create", "logs", "analysis", "blocks", "scripts", "reports", "advertiser-users"],
      advertiser: ["dashboard", "logs", "blocks", "reports", "scripts"]
    };
    const sectionIds = idsByRole[user?.role] || [];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-18% 0px -65% 0px", threshold: [0.1, 0.25, 0.5] }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [user?.role]);

  const allowedAdvertiserNames = useMemo(() => myAdvertisers.map((advertiser) => advertiser.name), [myAdvertisers]);
  const permissionLogs = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") return clickLogs;
    return clickLogs.filter((log) => allowedAdvertiserNames.includes(log.advertiser));
  }, [allowedAdvertiserNames, user]);
  const blockedAwareLogs = useMemo(() => enrichWithManualBlocks(permissionLogs, manualBlocks), [manualBlocks, permissionLogs]);
  const filteredLogs = useMemo(() => filterClicks(blockedAwareLogs, filters), [blockedAwareLogs, filters]);
  const summary = useMemo(() => summarizeClicks(filteredLogs), [filteredLogs]);
  const advertiserStats = useMemo(() => getAdvertiserStats(filteredLogs), [filteredLogs]);
  const mediaStats = useMemo(() => getMediaStats(filteredLogs), [filteredLogs]);
  const hourlyTrend = useMemo(() => getHourlyTrend(filteredLogs), [filteredLogs]);
  const blockedLogs = useMemo(() => filteredLogs.filter((log) => log.status === "차단"), [filteredLogs]);

  async function refreshAccess(nextUser = user) {
    if (!nextUser) return;
    const [advertiserResult, advertiserUserResult, assignmentResult] = await Promise.all([
      fetchMyAccessibleAdvertisers(nextUser),
      nextUser.role !== "advertiser" ? fetchAdvertiserUsers(nextUser) : Promise.resolve({ items: [] }),
      nextUser.role === "admin" ? fetchAdvertiserAssignments() : Promise.resolve({ items: assignments })
    ]);
    setMyAdvertisers(advertiserResult.items);
    setAdvertiserUsers(advertiserUserResult.items);
    setAssignments(assignmentResult.items);
  }

  async function handleSignIn(email, password) {
    setLoginLoading(true);
    const result = await signInWithEmail(email, password);
    if (result.ok) await loadAuthContext(result.user || await fetchCurrentUser());
    setLoginLoading(false);
    return result;
  }

  async function handleSignOut() {
    await signOut();
    await loadAuthContext(null);
  }

  function addManualBlock(item) {
    setManualBlocks((prev) => [item, ...prev.filter((block) => block.ip !== item.ip)]);
  }

  function removeManualBlock(ip) {
    setManualBlocks((prev) => prev.filter((block) => block.ip !== ip));
  }

  async function handleAssign(marketerId, advertiserId) {
    await assignAdvertiserToMarketer(marketerId, advertiserId);
    await refreshAccess();
  }

  async function handleRemoveAssignment(assignmentId) {
    await removeAdvertiserAssignment(assignmentId);
    await refreshAccess();
  }

  async function handleCreateAdvertiser(payload, currentUser) {
    const result = await createAdvertiserWithAccount(payload, currentUser);
    if (result.ok) await refreshAccess(currentUser);
    return result;
  }

  async function handleCreateAdvertiserUser(payload) {
    const result = await createAdvertiserUser(payload, user);
    await refreshAccess();
    return result;
  }

  async function handleUpdateAdvertiserUserPermission(id, permission) {
    await updateAdvertiserUserPermission(id, permission);
    await refreshAccess();
  }

  async function handleDeactivateAdvertiserUser(id) {
    await deactivateAdvertiserUser(id);
    await refreshAccess();
  }

  if (!authReady) return <div className="min-h-screen bg-ink" />;
  if (!user) return <LoginPage onSignIn={handleSignIn} loading={loginLoading} />;
  if (user.role !== "admin" && myAdvertisers.length === 0) return <EmptyAssignment user={user} onSignOut={handleSignOut} />;

  return (
    <div className="min-h-screen text-slate-200">
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} user={user} onSignOut={handleSignOut} />

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-ink/88 backdrop-blur no-print">
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold text-brand">INVALID CLICK PREVENTION</p>
              <h1 className="mt-1 text-xl font-bold tracking-normal text-white md:text-2xl">프로그레스미디어 무효클릭차단 솔루션</h1>
              <p className="mt-1 text-xs text-slate-500">{user.name} · {user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-slate-300">{filters.dateRange}</button>
              <button className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-slate-300">{filters.advertiser}</button>
              <button onClick={() => downloadClickReportCsv(filteredLogs)} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-ink">
                <Download size={14} />
                리포트 내보내기
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5 lg:px-8">
          <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={user.role === "admin" ? mockAdvertisers : myAdvertisers} />

          <div id="dashboard" className="space-y-5 scroll-mt-24">
            <SectionLead title={user.role === "admin" ? "전체 대시보드" : user.role === "advertiser" ? "내 대시보드" : "내 광고주"}>
              현재 계정 권한으로 접근 가능한 광고주의 클릭 품질과 차단 효과를 확인합니다.
            </SectionLead>
            <KpiCards summary={summary} />
            <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
              <ClickTrendChart data={hourlyTrend} />
              <ClickStatusChart summary={summary} />
            </div>
          </div>

          {user.role === "marketer" && <AdvertiserCreatePanel currentUser={user} onCreateAdvertiser={handleCreateAdvertiser} />}

          <ClickLogTable logs={filteredLogs} />

          {user.role !== "advertiser" && (
            <div id="analysis" className="space-y-5 scroll-mt-24">
              <SectionLead title="무효클릭 분석">광고주와 매체 단위로 위험 클릭이 어디에 집중되는지 비교합니다.</SectionLead>
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <AdvertiserChart data={advertiserStats} />
                <MediaChart data={mediaStats} />
              </div>
            </div>
          )}

          <BlockManagement manualBlocks={manualBlocks} blockedLogs={blockedLogs} onAddBlock={addManualBlock} onRemoveBlock={removeManualBlock} />
          <InstallScriptPanel advertisers={user.role === "admin" ? mockAdvertisers : myAdvertisers} />
          <AdvertiserReport advertiserStats={advertiserStats} logs={filteredLogs} />

          {user.role === "marketer" && (
            <AdvertiserUserManagement
              advertiserUsers={advertiserUsers}
              advertisers={myAdvertisers}
              onCreateUser={handleCreateAdvertiserUser}
              onUpdatePermission={handleUpdateAdvertiserUserPermission}
              onDeactivateUser={handleDeactivateAdvertiserUser}
            />
          )}

          {user.role === "admin" && (
            <AdminManagement
              teamMembers={teamMembers}
              advertisers={mockAdvertisers}
              assignments={assignments}
              onAssign={handleAssign}
              onRemove={handleRemoveAssignment}
            />
          )}
        </div>
      </main>
    </div>
  );
}
