import {
  clickLogs,
  getAdvertiserStats,
  getBlockRules,
  getHourlyTrend,
  getMediaStats,
  summarizeClicks
} from "@/lib/clickData";
import { canUseMockFallback, createSupabaseBrowserClient, getSupabaseConfigError, hasSupabaseConfig } from "@/lib/supabaseClient";

const MOCK_SESSION_KEY = "pm_mock_user_email";
const MOCK_USERS_KEY = "pm_mock_users";
const COMPANY_EMAIL_DOMAIN = "my-progress.co.kr";
const COMPANY_EMAIL_PATTERN = /^[^\s@]+@my-progress\.co\.kr$/i;
const COMPANY_EMAIL_ERROR = `회사 이메일만 가입 가능합니다. 허용 도메인: ${COMPANY_EMAIL_DOMAIN}`;

let advertiserSequence = 6;
let advertiserUserSequence = 3;
let assignmentSequence = 5;
let marketerSequence = 3;

export let mockAdvertisers = [
  { id: "adv_001", name: "샤브20", clientId: "pm-shabu20", projectKey: "pk_shabu20_demo", siteUrl: "https://shabu20.example.com", status: "active", createdBy: "user_marketer_1" },
  { id: "adv_002", name: "3분페이", clientId: "pm-3minpay", projectKey: "pk_3minpay_demo", siteUrl: "https://3minpay.example.com", status: "active", createdBy: "user_marketer_1" },
  { id: "adv_003", name: "대주바이오", clientId: "pm-daejoo-bio", projectKey: "pk_daejoo_demo", siteUrl: "https://daejoo.example.com", status: "active", createdBy: "user_marketer_2" },
  { id: "adv_004", name: "바른숨병원", clientId: "pm-hospital", projectKey: "pk_hospital_demo", siteUrl: "https://hospital.example.com", status: "active", createdBy: "user_marketer_2" },
  { id: "adv_005", name: "온리원쇼핑몰", clientId: "pm-onlyone-shop", projectKey: "pk_onlyone_demo", siteUrl: "https://onlyone.example.com", status: "active", createdBy: "user_admin" }
];

let mockUsers = [
  { id: "user_admin", email: "admin@my-progress.co.kr", name: "관리자", role: "admin", team: "운영관리", isActive: true },
  { id: "user_marketer_1", email: "yxxn98@my-progress.co.kr", name: "윤인홍", role: "marketer", team: "퍼포먼스1팀", isActive: true },
  { id: "user_marketer_2", email: "marketer2@my-progress.co.kr", name: "마케터B", role: "marketer", team: "퍼포먼스2팀", isActive: true },
  { id: "user_client_shabu20", email: "client-shabu20@example.com", name: "샤브20 광고주", role: "advertiser", team: "샤브20", isActive: true },
  { id: "user_client_3pay", email: "client-3pay@example.com", name: "3분페이 광고주", role: "advertiser", team: "3분페이", isActive: true }
];

let mockAssignments = [
  { id: "asg_001", marketerId: "user_marketer_1", advertiserId: "adv_001", permission: "manage", assignedAt: "2026-05-27 09:00" },
  { id: "asg_002", marketerId: "user_marketer_1", advertiserId: "adv_002", permission: "manage", assignedAt: "2026-05-27 09:00" },
  { id: "asg_003", marketerId: "user_marketer_2", advertiserId: "adv_003", permission: "manage", assignedAt: "2026-05-27 09:00" },
  { id: "asg_004", marketerId: "user_marketer_2", advertiserId: "adv_004", permission: "manage", assignedAt: "2026-05-27 09:00" }
];

let mockAdvertiserUsers = [
  { id: "adu_001", userId: "user_client_shabu20", advertiserId: "adv_001", permission: "manage", createdBy: "user_marketer_1", isActive: true, inviteLink: "https://app.progressmedia.example/invite/adu_001", temporaryPassword: "Temp!2026" },
  { id: "adu_002", userId: "user_client_3pay", advertiserId: "adv_002", permission: "view", createdBy: "user_marketer_1", isActive: true, inviteLink: "https://app.progressmedia.example/invite/adu_002", temporaryPassword: "Temp!2026" }
];

function browserSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function browserLocalStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function serviceUnavailable() {
  return { ok: false, error: getSupabaseConfigError() };
}

function ensureServiceMode() {
  if (hasSupabaseConfig()) return "supabase";
  if (canUseMockFallback()) return "mock";
  return "unavailable";
}

function hydrateMockUsers() {
  if (!canUseMockFallback()) return;
  const stored = browserLocalStorage()?.getItem(MOCK_USERS_KEY);
  if (!stored) return;
  try {
    const users = JSON.parse(stored);
    if (!Array.isArray(users)) return;
    const existingEmails = new Set(mockUsers.map((user) => user.email.toLowerCase()));
    mockUsers = [...mockUsers, ...users.filter((user) => user?.email && !existingEmails.has(user.email.toLowerCase()))];
  } catch {
    // Development-only storage may be cleared or malformed.
  }
}

function persistMockUser(user) {
  if (!canUseMockFallback()) return;
  const storage = browserLocalStorage();
  if (!storage) return;
  let users = [];
  try {
    users = JSON.parse(storage.getItem(MOCK_USERS_KEY) || "[]");
  } catch {
    users = [];
  }
  storage.setItem(MOCK_USERS_KEY, JSON.stringify([user, ...users.filter((item) => item.email?.toLowerCase() !== user.email.toLowerCase())]));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "advertiser";
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isAllowedCompanyEmail(email) {
  return COMPANY_EMAIL_PATTERN.test(email.trim());
}

function mapSupabaseProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name || profile.email,
    role: profile.role || "marketer",
    team: profile.team || "",
    isActive: profile.is_active !== false
  };
}

function profileFromAuthUser(authUser) {
  const metadata = authUser.user_metadata || {};
  const metadataRole = ["admin", "marketer", "advertiser"].includes(metadata.role) ? metadata.role : null;
  const role = metadataRole || (isAllowedCompanyEmail(authUser.email || "") ? "marketer" : "advertiser");
  return {
    id: authUser.id,
    email: authUser.email,
    name: metadata.name || authUser.email,
    role,
    team: metadata.team || "",
    isActive: true
  };
}

function profileToDb(profile) {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    team: profile.team,
    is_active: profile.isActive
  };
}

function advertiserFromDb(item) {
  return {
    id: item.id,
    name: item.name,
    clientId: item.client_id,
    projectKey: item.project_key,
    siteUrl: item.site_url,
    status: item.status,
    createdBy: item.created_by
  };
}

function statusToUi(status) {
  if (status === "blocked") return "차단";
  if (status === "suspicious") return "의심";
  return "정상";
}

function mapClickLogFromDb(item) {
  const createdAt = new Date(item.created_at);
  const hour = `${String(createdAt.getHours()).padStart(2, "0")}:00`;
  const dateTime = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")} ${String(createdAt.getHours()).padStart(2, "0")}:${String(createdAt.getMinutes()).padStart(2, "0")}`;
  return {
    id: item.id,
    createdAt,
    time: `${String(createdAt.getHours()).padStart(2, "0")}:${String(createdAt.getMinutes()).padStart(2, "0")}:${String(createdAt.getSeconds()).padStart(2, "0")}`,
    dateTime,
    hour,
    advertiser: item.advertiser?.name || item.client_id || "광고주",
    campaign: item.utm_campaign || "추적 스크립트",
    keyword: item.utm_term || "-",
    media: item.utm_source || item.referrer || "직접 유입",
    ip: item.ip_masked || "-",
    device: "-",
    region: "-",
    userAgent: item.user_agent || "-",
    landingPage: item.page_url || "-",
    dwellSeconds: item.stay_time || 0,
    pageViews: item.page_count || 0,
    cpc: Number(item.cpc || 0),
    riskScore: item.risk_score || 0,
    status: statusToUi(item.click_status),
    reason: item.reason || "normal"
  };
}

async function apiPost(path, payload) {
  const headers = { "Content-Type": "application/json" };
  if (hasSupabaseConfig()) {
    const { data } = await createSupabaseBrowserClient().auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: body.error || "요청 처리에 실패했습니다." };
  return body;
}

export function isSupabaseAuthEnabled() {
  return hasSupabaseConfig();
}

export function generateProjectKey(name = "advertiser") {
  const randomPart = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(advertiserSequence).padStart(3, "0");
  return `pk_${slugify(name)}_${randomPart}`;
}

export function generateInstallScript(clientId, projectKey) {
  const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_URL || "/pm-click-shield.js";
  return `<script src="${trackerUrl}" data-client-id="${clientId}" data-project-key="${projectKey}" async></script>`;
}

export async function fetchCurrentUser() {
  const mode = ensureServiceMode();
  if (mode === "unavailable") throw new Error(getSupabaseConfigError());

  if (mode === "supabase") {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    const authUser = sessionData.session?.user;
    if (!authUser) return null;

    const { data: profile, error } = await supabase
      .from("pm_profiles")
      .select("id,email,name,role,team,is_active")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const mappedProfile = mapSupabaseProfile(profile);
    if (mappedProfile) return mappedProfile;

    const fallbackProfile = profileFromAuthUser(authUser);
    if (fallbackProfile.role === "marketer") {
      await supabase.from("pm_profiles").upsert(profileToDb(fallbackProfile));
    }
    return fallbackProfile;
  }

  hydrateMockUsers();
  const storedEmail = browserSessionStorage()?.getItem(MOCK_SESSION_KEY);
  return mockUsers.find((user) => user.email === storedEmail && user.isActive) || null;
}

export async function signInWithEmail(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const mode = ensureServiceMode();
  if (mode === "unavailable") return serviceUnavailable();

  if (mode === "supabase") {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: await fetchCurrentUser() };
  }

  hydrateMockUsers();
  const user = mockUsers.find((item) => item.email.toLowerCase() === normalizedEmail && item.isActive);
  if (!user) return { ok: false, error: "등록되지 않았거나 비활성화된 계정입니다." };
  browserSessionStorage()?.setItem(MOCK_SESSION_KEY, user.email);
  return { ok: true, user };
}

export async function signUpMarketerAccount({ name, email, password, team }) {
  const normalizedEmail = normalizeEmail(email);
  if (!isAllowedCompanyEmail(normalizedEmail)) return { ok: false, error: COMPANY_EMAIL_ERROR };

  const mode = ensureServiceMode();
  if (mode === "unavailable") return serviceUnavailable();

  if (mode === "supabase") {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { name, role: "marketer", team } }
    });
    if (error) return { ok: false, error: error.message };

    if (data.user) {
      const profile = { id: data.user.id, email: normalizedEmail, name, role: "marketer", team, is_active: true };
      await supabase.from("pm_profiles").upsert(profile);
      return { ok: true, user: mapSupabaseProfile(profile) };
    }
    return { ok: true, user: await fetchCurrentUser() };
  }

  hydrateMockUsers();
  const exists = mockUsers.some((user) => user.email.toLowerCase() === normalizedEmail);
  if (exists) return { ok: false, error: "이미 등록된 이메일입니다." };
  const user = {
    id: `user_marketer_mock_${String(marketerSequence++).padStart(3, "0")}`,
    email: normalizedEmail,
    name,
    role: "marketer",
    team,
    isActive: true
  };
  mockUsers = [user, ...mockUsers];
  persistMockUser(user);
  browserSessionStorage()?.setItem(MOCK_SESSION_KEY, user.email);
  return { ok: true, user };
}

export async function signOut() {
  const mode = ensureServiceMode();
  if (mode === "supabase") await createSupabaseBrowserClient().auth.signOut();
  if (mode === "mock") browserSessionStorage()?.removeItem(MOCK_SESSION_KEY);
  return { ok: true };
}

export async function fetchMyAccessibleAdvertisers(user) {
  if (!user) return { items: [] };
  const mode = ensureServiceMode();
  if (mode === "unavailable") return { items: [] };

  if (mode === "supabase") {
    const supabase = createSupabaseBrowserClient();
    if (user.role === "admin") {
      const { data, error } = await supabase.from("pm_advertisers").select("id,name,client_id,project_key,site_url,status,created_by").order("name");
      if (error) throw new Error(error.message);
      return { items: (data || []).map(advertiserFromDb) };
    }
    if (user.role === "marketer") {
      const { data, error } = await supabase
        .from("pm_marketer_advertisers")
        .select("advertiser:pm_advertisers(id,name,client_id,project_key,site_url,status,created_by),permission")
        .eq("marketer_id", user.id);
      if (error) throw new Error(error.message);
      return { items: (data || []).filter((item) => item.advertiser).map((item) => ({ ...advertiserFromDb(item.advertiser), permission: item.permission })) };
    }
    const { data, error } = await supabase
      .from("pm_advertiser_users")
      .select("advertiser:pm_advertisers(id,name,client_id,project_key,site_url,status,created_by),permission")
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return { items: (data || []).filter((item) => item.advertiser).map((item) => ({ ...advertiserFromDb(item.advertiser), permission: item.permission })) };
  }

  if (user.role === "admin") return { items: mockAdvertisers };
  if (user.role === "marketer") {
    const advertiserIds = mockAssignments.filter((item) => item.marketerId === user.id).map((item) => item.advertiserId);
    return { items: mockAdvertisers.filter((advertiser) => advertiserIds.includes(advertiser.id)) };
  }
  const advertiserIds = mockAdvertiserUsers.filter((item) => item.userId === user.id && item.isActive).map((item) => item.advertiserId);
  return { items: mockAdvertisers.filter((advertiser) => advertiserIds.includes(advertiser.id)) };
}

export const fetchMyAdvertisers = fetchMyAccessibleAdvertisers;

export async function fetchTeamMembers() {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const { data, error } = await createSupabaseBrowserClient().from("pm_profiles").select("id,email,name,role,team,is_active").order("name");
    if (error) throw new Error(error.message);
    return { items: (data || []).map(mapSupabaseProfile) };
  }
  if (mode === "mock") {
    hydrateMockUsers();
    return { items: mockUsers };
  }
  return { items: [] };
}

export async function fetchAdvertiserAssignments() {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const { data, error } = await createSupabaseBrowserClient()
      .from("pm_marketer_advertisers")
      .select("id,marketer_id,advertiser_id,permission,assigned_at");
    if (error) throw new Error(error.message);
    return { items: (data || []).map((item) => ({ id: item.id, marketerId: item.marketer_id, advertiserId: item.advertiser_id, permission: item.permission, assignedAt: item.assigned_at })) };
  }
  return { items: mode === "mock" ? mockAssignments : [] };
}

export async function assignAdvertiserToMarketer(marketerId, advertiserId, permission = "manage") {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const { data, error } = await createSupabaseBrowserClient()
      .from("pm_marketer_advertisers")
      .insert({ marketer_id: marketerId, advertiser_id: advertiserId, permission })
      .select("id,marketer_id,advertiser_id,permission,assigned_at")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, assignment: data };
  }
  if (mode === "unavailable") return serviceUnavailable();
  const assignment = { id: `asg_mock_${assignmentSequence++}`, marketerId, advertiserId, permission, assignedAt: "2026-05-27 09:00" };
  mockAssignments = [assignment, ...mockAssignments.filter((item) => !(item.marketerId === marketerId && item.advertiserId === advertiserId))];
  return { ok: true, assignment };
}

export async function removeAdvertiserAssignment(assignmentId) {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const { error } = await createSupabaseBrowserClient().from("pm_marketer_advertisers").delete().eq("id", assignmentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  if (mode === "mock") {
    mockAssignments = mockAssignments.filter((item) => item.id !== assignmentId);
    return { ok: true };
  }
  return serviceUnavailable();
}

export async function createAdvertiserWithAccount(payload, currentUser) {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    return apiPost("/api/advertisers", {
      advertiserName: payload.name,
      siteUrl: payload.siteUrl,
      contactName: payload.contactName,
      advertiserEmail: payload.loginEmail,
      temporaryPassword: payload.temporaryPassword,
      permission: payload.permission,
      status: payload.status
    });
  }
  if (mode === "unavailable") return serviceUnavailable();

  const clientId = `pm-${slugify(payload.name)}-${String(advertiserSequence).padStart(3, "0")}`;
  const projectKey = generateProjectKey(payload.name);
  const advertiserId = `adv_${String(advertiserSequence).padStart(3, "0")}`;
  const advertiserUserId = `user_client_${String(advertiserSequence).padStart(3, "0")}`;
  const advertiserUserLinkId = `adu_${String(advertiserUserSequence++).padStart(3, "0")}`;
  advertiserSequence += 1;

  const advertiser = { id: advertiserId, name: payload.name, clientId, projectKey, siteUrl: payload.siteUrl, status: payload.status, createdBy: currentUser.id };
  const advertiserUser = { id: advertiserUserId, email: payload.loginEmail, name: payload.contactName, role: "advertiser", team: payload.name, isActive: payload.status === "active" };
  const advertiserUserLink = {
    id: advertiserUserLinkId,
    userId: advertiserUserId,
    advertiserId,
    permission: payload.permission,
    createdBy: currentUser.id,
    isActive: true,
    inviteLink: `https://app.progressmedia.example/invite/${advertiserUserLinkId}`,
    temporaryPassword: payload.temporaryPassword || "Temp!2026"
  };
  const assignment = { id: `asg_mock_${assignmentSequence++}`, marketerId: currentUser.id, advertiserId, permission: "manage", assignedAt: "2026-05-27 09:00" };

  mockAdvertisers = [advertiser, ...mockAdvertisers];
  mockUsers = [advertiserUser, ...mockUsers];
  mockAdvertiserUsers = [advertiserUserLink, ...mockAdvertiserUsers];
  mockAssignments = [assignment, ...mockAssignments];

  return { ok: true, advertiser, advertiserUser, advertiserUserLink, assignment, installScript: generateInstallScript(clientId, projectKey) };
}

export async function fetchAdvertiserUsers(user) {
  if (!user) return { items: [] };
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const { data, error } = await createSupabaseBrowserClient()
      .from("pm_advertiser_users")
      .select("id,user_id,advertiser_id,permission,created_by,created_at,profile:pm_profiles(id,email,name,is_active),advertiser:pm_advertisers(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      items: (data || []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        advertiserId: item.advertiser_id,
        permission: item.permission,
        createdBy: item.created_by,
        email: item.profile?.email,
        name: item.profile?.name,
        advertiserName: item.advertiser?.name,
        isActive: item.profile?.is_active !== false
      }))
    };
  }
  if (mode !== "mock") return { items: [] };

  const accessible = await fetchMyAccessibleAdvertisers(user);
  const advertiserIds = accessible.items.map((item) => item.id);
  const rows = mockAdvertiserUsers
    .filter((item) => user.role === "admin" || advertiserIds.includes(item.advertiserId))
    .map((item) => {
      const profile = mockUsers.find((mockUser) => mockUser.id === item.userId);
      const advertiser = mockAdvertisers.find((mockAdvertiser) => mockAdvertiser.id === item.advertiserId);
      return { ...item, email: profile?.email, name: profile?.name, advertiserName: advertiser?.name };
    });
  return { items: rows };
}

export async function createAdvertiserUser(payload, currentUser) {
  const mode = ensureServiceMode();
  if (mode === "supabase") return apiPost("/api/advertiser-users", { ...payload, createdBy: currentUser.id });
  if (mode === "unavailable") return serviceUnavailable();

  const id = `adu_${String(advertiserUserSequence++).padStart(3, "0")}`;
  const userId = `user_client_${id}`;
  const profile = { id: userId, email: payload.email, name: payload.name, role: "advertiser", team: payload.advertiserName || "광고주", isActive: true };
  const row = {
    id,
    userId,
    advertiserId: payload.advertiserId,
    permission: payload.permission,
    createdBy: currentUser.id,
    isActive: true,
    inviteLink: `https://app.progressmedia.example/invite/${id}`,
    temporaryPassword: payload.temporaryPassword || "Temp!2026"
  };
  mockUsers = [profile, ...mockUsers];
  mockAdvertiserUsers = [row, ...mockAdvertiserUsers];
  return { ok: true, user: profile, advertiserUser: row };
}

export async function updateAdvertiserUserPermission(advertiserUserId, permission) {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const { error } = await createSupabaseBrowserClient().from("pm_advertiser_users").update({ permission }).eq("id", advertiserUserId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  mockAdvertiserUsers = mockAdvertiserUsers.map((item) => item.id === advertiserUserId ? { ...item, permission } : item);
  return { ok: true };
}

export async function deactivateAdvertiserUser(advertiserUserId) {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const { error } = await createSupabaseBrowserClient().from("pm_advertiser_users").update({ is_active: false }).eq("id", advertiserUserId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const target = mockAdvertiserUsers.find((item) => item.id === advertiserUserId);
  mockAdvertiserUsers = mockAdvertiserUsers.map((item) => item.id === advertiserUserId ? { ...item, isActive: false } : item);
  if (target) mockUsers = mockUsers.map((user) => user.id === target.userId ? { ...user, isActive: false } : user);
  return { ok: true };
}

export async function fetchClickLogs(filters = {}) {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const supabase = createSupabaseBrowserClient();
    let query = supabase
      .from("pm_click_logs")
      .select("id,advertiser_id,client_id,visitor_id,session_id,ip_masked,user_agent,page_url,referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content,stay_time,page_count,click_status,risk_score,reason,cpc,created_at,advertiser:pm_advertisers(name)")
      .order("created_at", { ascending: false })
      .limit(filters.limit || 500);

    if (filters.advertiserIds?.length) query = query.in("advertiser_id", filters.advertiserIds);
    const { data, error } = await query;
    if (error) return { items: [], total: 0, error: error.message };
    const items = (data || []).map(mapClickLogFromDb);
    return { items, total: items.length };
  }
  if (mode === "mock") return { items: clickLogs, total: clickLogs.length, filters };
  return { items: [], total: 0, error: getSupabaseConfigError() };
}

export async function fetchClickDashboard(logs = clickLogs) {
  return { summary: summarizeClicks(logs), advertiserStats: getAdvertiserStats(logs), mediaStats: getMediaStats(logs), hourlyTrend: getHourlyTrend(logs) };
}

export async function fetchAdvertiserReports(logs = clickLogs) {
  return { summary: summarizeClicks(logs), advertisers: getAdvertiserStats(logs), media: getMediaStats(logs), hourly: getHourlyTrend(logs) };
}

export async function fetchBlockRules() {
  return { items: getBlockRules() };
}

export async function createManualBlock(payload) {
  return { ok: true, block: { id: "mock-block-001", method: "manual", createdAt: "2026-05-27 14:30", ...payload } };
}

export async function removeBlock(blockId) {
  return { ok: true, releasedBlockId: blockId, releasedAt: "2026-05-27 14:30" };
}

export async function fetchAdvertisers() {
  const mode = ensureServiceMode();
  if (mode === "supabase") {
    const { data, error } = await createSupabaseBrowserClient().from("pm_advertisers").select("id,name,client_id,project_key,site_url,status,created_by").order("name");
    if (error) throw new Error(error.message);
    return { items: (data || []).map(advertiserFromDb) };
  }
  return { items: mode === "mock" ? mockAdvertisers : [] };
}

export async function createAdvertiser(payload) {
  return createAdvertiserWithAccount(payload, { id: payload.createdBy || "user_mock" });
}

export async function fetchInstallScript(advertiserId) {
  const advertiser = mockAdvertisers.find((item) => item.id === advertiserId) || mockAdvertisers[0];
  return {
    advertiserId: advertiser.id,
    clientId: advertiser.clientId,
    projectKey: advertiser.projectKey,
    installStatus: "mock",
    lastSeenAt: null,
    script: generateInstallScript(advertiser.clientId, advertiser.projectKey)
  };
}
