"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clickLogs, getAdvertiserStats, getHourlyTrend, getMediaStats, summarizeClicks } from "@/lib/clickData";
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
  const [loginLoading, setLoginLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [myAdvertisers, setMyAdvertisers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [advertiserUsers, setAdvertiserUsers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [manualBlocks, setManualBlocks] = useState(initialManualBlocks);

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

  const value = {
    authReady,
    loginLoading,
    user,
    myAdvertisers,
    allAdvertisers: mockAdvertisers,
    teamMembers,
    assignments,
    advertiserUsers,
    filters,
    setFilters,
    manualBlocks,
    filteredLogs,
    blockedLogs,
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
