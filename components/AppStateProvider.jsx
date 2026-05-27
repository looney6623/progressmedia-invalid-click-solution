"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAdvertiserStats, getHourlyTrend, getMediaStats, summarizeClicks } from "@/lib/clickData";
import { enrichWithManualBlocks, filterClicks } from "@/lib/filterClicks";
import {
  assignAdvertiserToMarketer,
  createManualBlock,
  createAdvertiserUser,
  createAdvertiserWithAccount,
  deactivateAdvertiserUser,
  fetchAdvertiserAssignments,
  fetchAdvertiserUsers,
  fetchBlockedIps,
  fetchClickLogs,
  fetchCurrentUser,
  fetchMyAccessibleAdvertisers,
  fetchTeamMembers,
  mockAdvertisers,
  removeBlock,
  removeAdvertiserAssignment,
  signInWithEmail,
  signOut,
  signUpMarketerAccount,
  updateAdvertiserUserPermission
} from "@/services/clickService";

const AppStateContext = createContext(null);

const initialManualBlocks = [
  { ip: "211.44.18.91", reason: "샤브20 브랜드 키워드 반복 클릭", createdAt: "2026-05-27 14:29", method: "수동 차단" },
  { ip: "59.9.104.201", reason: "3분페이 제휴 매체 저품질 유입", createdAt: "2026-05-27 14:12", method: "수동 차단" }
];

const initialFilters = {
  advertiser: "전체",
  media: "전체",
  status: "전체",
  dateRange: "오늘",
  query: ""
};

export function AppStateProvider({ children }) {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [myAdvertisers, setMyAdvertisers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [advertiserUsers, setAdvertiserUsers] = useState([]);
  const [sourceLogs, setSourceLogs] = useState([]);
  const [dataError, setDataError] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [manualBlocks, setManualBlocks] = useState(initialManualBlocks);

  async function loadAuthContext(nextUser) {
    if (!nextUser) {
      setUser(null);
      setMyAdvertisers([]);
      setTeamMembers([]);
      setAssignments([]);
      setAdvertiserUsers([]);
      setSourceLogs([]);
      setDataError("");
      return;
    }

    const [advertiserResult, memberResult, assignmentResult, advertiserUserResult, blockResult] = await Promise.all([
      fetchMyAccessibleAdvertisers(nextUser),
      nextUser.role === "admin" ? fetchTeamMembers() : Promise.resolve({ items: [] }),
      nextUser.role === "admin" ? fetchAdvertiserAssignments() : Promise.resolve({ items: [] }),
      nextUser.role !== "advertiser" ? fetchAdvertiserUsers(nextUser) : Promise.resolve({ items: [] }),
      fetchBlockedIps()
    ]);

    setUser(nextUser);
    setMyAdvertisers(advertiserResult.items);
    setTeamMembers(memberResult.items);
    setAssignments(assignmentResult.items);
    setAdvertiserUsers(advertiserUserResult.items);
    setManualBlocks(blockResult.items?.length ? blockResult.items : initialManualBlocks);
    setFilters((prev) => ({ ...prev, advertiser: "전체" }));

    const logResult = await fetchClickLogs({
      advertiserIds: nextUser.role === "admin" ? undefined : advertiserResult.items.map((item) => item.id)
    });
    setSourceLogs(logResult.items || []);
    setDataError(logResult.error || "");
  }

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then(async (currentUser) => {
        if (!active) return;
        await loadAuthContext(currentUser);
      })
      .catch((error) => {
        if (active) setAuthError(error.message || "인증 상태를 확인하지 못했습니다.");
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refreshAccess(nextUser = user) {
    if (!nextUser) return;
    const [advertiserResult, advertiserUserResult, assignmentResult, blockResult] = await Promise.all([
      fetchMyAccessibleAdvertisers(nextUser),
      nextUser.role !== "advertiser" ? fetchAdvertiserUsers(nextUser) : Promise.resolve({ items: [] }),
      nextUser.role === "admin" ? fetchAdvertiserAssignments() : Promise.resolve({ items: assignments }),
      fetchBlockedIps()
    ]);
    setMyAdvertisers(advertiserResult.items);
    setAdvertiserUsers(advertiserUserResult.items);
    setAssignments(assignmentResult.items);
    if (blockResult.items) setManualBlocks(blockResult.items);
    const logResult = await fetchClickLogs({
      advertiserIds: nextUser.role === "admin" ? undefined : advertiserResult.items.map((item) => item.id)
    });
    setSourceLogs(logResult.items || []);
    setDataError(logResult.error || "");
  }

  async function handleSignIn(email, password) {
    setLoginLoading(true);
    const result = await signInWithEmail(email, password);
    if (result.ok) await loadAuthContext(result.user || await fetchCurrentUser());
    setLoginLoading(false);
    return result;
  }

  async function handleSignUp(payload) {
    setLoginLoading(true);
    const result = await signUpMarketerAccount(payload);
    if (result.ok) await loadAuthContext(result.user || await fetchCurrentUser());
    setLoginLoading(false);
    return result;
  }

  async function handleSignOut() {
    await signOut();
    await loadAuthContext(null);
  }

  async function addManualBlock(item) {
    const result = await createManualBlock(item, user);
    if (!result.ok) {
      setDataError(result.error || "차단 IP 저장에 실패했습니다.");
      return result;
    }
    const block = result.block || item;
    setManualBlocks((prev) => [block, ...prev.filter((existing) => existing.ip !== block.ip)]);
    return result;
  }

  async function removeManualBlock(idOrIp) {
    const target = manualBlocks.find((block) => block.id === idOrIp || block.ip === idOrIp);
    if (target?.id) {
      const result = await removeBlock(target.id);
      if (!result.ok) {
        setDataError(result.error || "차단 해제에 실패했습니다.");
        return result;
      }
    }
    setManualBlocks((prev) => prev.filter((block) => block.id !== idOrIp && block.ip !== idOrIp));
    return { ok: true };
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

  const allowedAdvertiserNames = useMemo(() => myAdvertisers.map((advertiser) => advertiser.name), [myAdvertisers]);

  const permissionLogs = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") return sourceLogs;
    return sourceLogs.filter((log) => allowedAdvertiserNames.includes(log.advertiser));
  }, [allowedAdvertiserNames, sourceLogs, user]);

  const blockedAwareLogs = useMemo(() => enrichWithManualBlocks(permissionLogs, manualBlocks), [manualBlocks, permissionLogs]);
  const filteredLogs = useMemo(() => filterClicks(blockedAwareLogs, filters), [blockedAwareLogs, filters]);
  const summary = useMemo(() => summarizeClicks(filteredLogs), [filteredLogs]);
  const advertiserStats = useMemo(() => getAdvertiserStats(filteredLogs), [filteredLogs]);
  const mediaStats = useMemo(() => getMediaStats(filteredLogs), [filteredLogs]);
  const hourlyTrend = useMemo(() => getHourlyTrend(filteredLogs), [filteredLogs]);
  const blockedLogs = useMemo(() => filteredLogs.filter((log) => log.status === "차단"), [filteredLogs]);
  const suspiciousLogs = useMemo(() => filteredLogs.filter((log) => log.status === "의심"), [filteredLogs]);

  const value = {
    authReady,
    authError,
    loginLoading,
    user,
    myAdvertisers,
    allAdvertisers: user?.role === "admin" ? myAdvertisers : mockAdvertisers,
    teamMembers,
    assignments,
    advertiserUsers,
    dataError,
    filters,
    setFilters,
    manualBlocks,
    filteredLogs,
    blockedLogs,
    suspiciousLogs,
    summary,
    advertiserStats,
    mediaStats,
    hourlyTrend,
    handleSignIn,
    handleSignUp,
    handleSignOut,
    addManualBlock,
    removeManualBlock,
    handleAssign,
    handleRemoveAssignment,
    handleCreateAdvertiser,
    handleCreateAdvertiserUser,
    handleUpdateAdvertiserUserPermission,
    handleDeactivateAdvertiserUser,
    refreshAccess
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
}
