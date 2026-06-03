"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAdvertiserStats, getHourlyTrend, getMediaStats, summarizeClicks } from "@/lib/clickData";
import { filterClicks } from "@/lib/filterClicks";
import {
  assignAdvertiserToMarketer,
  createManualBlock,
  createAdvertiserUser,
  createAdvertiserWithAccount,
  deactivateAdvertiserUser,
  fetchAdvertiserAssignments,
  fetchAdvertiserUsers,
  fetchBlockedIps,
  fetchBlockRules,
  fetchClickLogs,
  fetchConversionEvents,
  fetchCurrentUser,
  fetchMyAccessibleAdvertisers,
  fetchTeamMembers,
  mockAdvertisers,
  removeBlock,
  removeAdvertiserAssignment,
  signInWithEmail,
  signOut,
  signUpMarketerAccount,
  updateAdvertiserBlocking,
  updateBlockRule,
  updateClickLogStatus,
  updateAdvertiserUserPermission
} from "@/services/clickService";

const AppStateContext = createContext(null);

const initialFilters = {
  advertiser: "전체",
  media: "all",
  status: "전체",
  dateRange: "오늘",
  query: ""
};

function blockIdentity(block) {
  const scopedIp = block.ipHash || block.ipMasked || block.ip || "";
  if (!scopedIp) return block.id || "";
  return `${block.advertiserId || ""}:${scopedIp}`;
}

function isSameBlock(left, right) {
  if (left.id && right.id) return left.id === right.id;
  const leftIdentity = blockIdentity(left);
  const rightIdentity = blockIdentity(right);
  return Boolean(leftIdentity && rightIdentity && leftIdentity === rightIdentity);
}

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
  const [conversionEvents, setConversionEvents] = useState([]);
  const [dataError, setDataError] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [manualBlocks, setManualBlocks] = useState([]);
  const [releasedBlocks, setReleasedBlocks] = useState([]);
  const [blockRules, setBlockRules] = useState([]);

  async function loadAuthContext(nextUser) {
    if (!nextUser) {
      setUser(null);
      setMyAdvertisers([]);
      setTeamMembers([]);
      setAssignments([]);
      setAdvertiserUsers([]);
      setSourceLogs([]);
      setConversionEvents([]);
      setDataError("");
      return;
    }

    const [advertiserResult, memberResult, assignmentResult, advertiserUserResult, blockResult, releasedBlockResult, ruleResult] = await Promise.all([
      fetchMyAccessibleAdvertisers(nextUser),
      nextUser.role === "admin" ? fetchTeamMembers() : Promise.resolve({ items: [] }),
      nextUser.role === "admin" ? fetchAdvertiserAssignments() : Promise.resolve({ items: [] }),
      nextUser.role !== "advertiser" ? fetchAdvertiserUsers(nextUser) : Promise.resolve({ items: [] }),
      fetchBlockedIps(),
      fetchBlockedIps({ status: "released" }),
      fetchBlockRules()
    ]);

    setUser(nextUser);
    setMyAdvertisers(advertiserResult.items);
    setTeamMembers(memberResult.items);
    setAssignments(assignmentResult.items);
    setAdvertiserUsers(advertiserUserResult.items);
    setManualBlocks(blockResult.items || []);
    setReleasedBlocks(releasedBlockResult.items || []);
    setBlockRules(ruleResult.items || []);
    setFilters((prev) => ({ ...prev, advertiser: "전체" }));

    const logResult = await fetchClickLogs({
      advertiserIds: nextUser.role === "admin" ? undefined : advertiserResult.items.map((item) => item.id)
    });
    const conversionResult = await fetchConversionEvents({
      advertiserIds: nextUser.role === "admin" ? undefined : advertiserResult.items.map((item) => item.id)
    });
    setSourceLogs(logResult.items || []);
    setConversionEvents(conversionResult.items || []);
    setDataError(logResult.error || conversionResult.error || "");
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
    const [advertiserResult, advertiserUserResult, assignmentResult, blockResult, releasedBlockResult, ruleResult] = await Promise.all([
      fetchMyAccessibleAdvertisers(nextUser),
      nextUser.role !== "advertiser" ? fetchAdvertiserUsers(nextUser) : Promise.resolve({ items: [] }),
      nextUser.role === "admin" ? fetchAdvertiserAssignments() : Promise.resolve({ items: assignments }),
      fetchBlockedIps(),
      fetchBlockedIps({ status: "released" }),
      fetchBlockRules()
    ]);
    setMyAdvertisers(advertiserResult.items);
    setAdvertiserUsers(advertiserUserResult.items);
    setAssignments(assignmentResult.items);
    if (blockResult.items) setManualBlocks(blockResult.items);
    if (releasedBlockResult.items) setReleasedBlocks(releasedBlockResult.items);
    if (ruleResult.items) setBlockRules(ruleResult.items);
    const logResult = await fetchClickLogs({
      advertiserIds: nextUser.role === "admin" ? undefined : advertiserResult.items.map((item) => item.id)
    });
    const conversionResult = await fetchConversionEvents({
      advertiserIds: nextUser.role === "admin" ? undefined : advertiserResult.items.map((item) => item.id)
    });
    setSourceLogs(logResult.items || []);
    setConversionEvents(conversionResult.items || []);
    setDataError(logResult.error || conversionResult.error || "");
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
    setManualBlocks((prev) => [block, ...prev.filter((existing) => !isSameBlock(existing, block))]);
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
    await refreshAccess();
    return { ok: true };
  }

  async function handleUpdateBlockRule(rule, patch) {
    const previous = blockRules;
    setBlockRules((prev) => prev.map((item) => item.id === rule.id ? { ...item, ...patch } : item));
    const result = await updateBlockRule(rule, patch);
    if (!result.ok) {
      setBlockRules(previous);
      setDataError(result.error || "자동 차단 규칙 저장에 실패했습니다.");
      return result;
    }
    if (result.rule) {
      setBlockRules((prev) => prev.map((item) => item.id === result.rule.id ? result.rule : item));
    } else {
      await refreshAccess();
    }
    return result;
  }

  async function handleUpdateAdvertiserBlocking(advertiserId, blockingEnabled) {
    const previous = blockRules;
    setBlockRules((prev) => prev.map((item) => item.advertiserId === advertiserId ? { ...item, blockingEnabled } : item));
    const result = await updateAdvertiserBlocking(advertiserId, blockingEnabled);
    if (!result.ok) {
      setBlockRules(previous);
      setDataError(result.error || "긴급 자동 차단 중지 설정에 실패했습니다.");
      return result;
    }
    await refreshAccess();
    return result;
  }

  async function handleUpdateClickLogStatus(logId, clickStatus, reason) {
    const result = await updateClickLogStatus(logId, clickStatus, reason);
    if (!result.ok) {
      setDataError(result.error || "로그 상태 정정에 실패했습니다.");
      return result;
    }
    await refreshAccess();
    return result;
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

  const allowedAdvertiserIds = useMemo(() => myAdvertisers.map((advertiser) => advertiser.id).filter(Boolean), [myAdvertisers]);
  const allowedAdvertiserNames = useMemo(() => myAdvertisers.map((advertiser) => advertiser.name), [myAdvertisers]);

  const permissionLogs = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") return sourceLogs;
    return sourceLogs.filter((log) => (
      log.advertiserId
        ? allowedAdvertiserIds.includes(log.advertiserId)
        : allowedAdvertiserNames.includes(log.advertiser)
    ));
  }, [allowedAdvertiserIds, allowedAdvertiserNames, sourceLogs, user]);

  const filteredLogs = useMemo(() => filterClicks(permissionLogs, filters), [permissionLogs, filters]);
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
    conversionEvents,
    dataError,
    filters,
    setFilters,
    manualBlocks,
    releasedBlocks,
    blockRules,
    accessibleLogs: permissionLogs,
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
    handleUpdateBlockRule,
    handleUpdateAdvertiserBlocking,
    handleUpdateClickLogStatus,
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
