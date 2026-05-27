import {
  clickLogs,
  getAdvertiserStats,
  getBlockRules,
  getHourlyTrend,
  getMediaStats,
  summarizeClicks
} from "@/lib/clickData";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabaseClient";

const MOCK_SESSION_KEY = "pm_mock_user_email";
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

function browserStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "advertiser";
}

export function generateProjectKey(name = "advertiser") {
  return `pk_${slugify(name)}_${String(advertiserSequence).padStart(3, "0")}`;
}

export function generateInstallScript(clientId, projectKey) {
  return `<script>
(function(w,d,s,u,c,p){
  w.pmInvalidClick=w.pmInvalidClick||function(){(w.pmInvalidClick.q=w.pmInvalidClick.q||[]).push(arguments)};
  w.pmInvalidClick("init",{clientId:c,projectKey:p});
  var js=d.createElement(s); js.async=true; js.src=u;
  d.head.appendChild(js);
})(window,document,"script","https://cdn.progressmedia.co.kr/invalid-click.js","${clientId}","${projectKey}");
</script>`;
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

export function isSupabaseAuthEnabled() {
  return hasSupabaseConfig();
}

function isAllowedCompanyEmail(email) {
  return COMPANY_EMAIL_PATTERN.test(email.trim());
}

export async function fetchCurrentUser() {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return null;

    const { data: profile } = await supabase
      .from("pm_profiles")
      .select("id,email,name,role,team,is_active")
      .eq("id", authUser.id)
      .maybeSingle();

    return mapSupabaseProfile(profile) || {
      id: authUser.id,
      email: authUser.email,
      name: authUser.email,
      role: "advertiser",
      team: "",
      isActive: true
    };
  }

  const storedEmail = browserStorage()?.getItem(MOCK_SESSION_KEY);
  return mockUsers.find((user) => user.email === storedEmail && user.isActive) || null;
}

export async function signInWithEmail(email, password) {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: await fetchCurrentUser() };
  }

  const user = mockUsers.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.isActive);
  if (!user) return { ok: false, error: "등록되지 않았거나 비활성화된 mock 계정입니다." };
  browserStorage()?.setItem(MOCK_SESSION_KEY, user.email);
  return { ok: true, user };
}

export async function signUpMarketerAccount({ name, email, password, team }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedCompanyEmail(normalizedEmail)) {
    return { ok: false, error: COMPANY_EMAIL_ERROR };
  }

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name,
          role: "marketer",
          team
        }
      }
    });

    if (error) return { ok: false, error: error.message };

    if (data.user) {
      const profile = {
        id: data.user.id,
        email: normalizedEmail,
        name,
        role: "marketer",
        team,
        is_active: true
      };
      await supabase.from("pm_profiles").upsert(profile);
      return { ok: true, user: mapSupabaseProfile(profile) };
    }

    return { ok: true, user: await fetchCurrentUser() };
  }

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
  browserStorage()?.setItem(MOCK_SESSION_KEY, user.email);
  return { ok: true, user };
}

export async function signOut() {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    return { ok: true };
  }
  browserStorage()?.removeItem(MOCK_SESSION_KEY);
  return { ok: true };
}

export async function fetchMyAccessibleAdvertisers(user) {
  if (!user) return { items: [] };

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    if (user.role === "admin") {
      const { data } = await supabase.from("pm_advertisers").select("id,name,client_id,project_key,site_url,status,created_by").order("name");
      return { items: (data || []).map(advertiserFromDb) };
    }
    if (user.role === "marketer") {
      const { data } = await supabase
        .from("pm_marketer_advertisers")
        .select("advertiser:pm_advertisers(id,name,client_id,project_key,site_url,status,created_by),permission")
        .eq("marketer_id", user.id);
      return { items: (data || []).map((item) => ({ ...advertiserFromDb(item.advertiser), permission: item.permission })) };
    }
    const { data } = await supabase
      .from("pm_advertiser_users")
      .select("advertiser:pm_advertisers(id,name,client_id,project_key,site_url,status,created_by),permission")
      .eq("user_id", user.id);
    return { items: (data || []).map((item) => ({ ...advertiserFromDb(item.advertiser), permission: item.permission })) };
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
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("pm_profiles").select("id,email,name,role,team,is_active").order("name");
    return { items: (data || []).map(mapSupabaseProfile) };
  }
  return { items: mockUsers };
}

export async function fetchAdvertiserAssignments() {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("pm_marketer_advertisers")
      .select("id,marketer_id,advertiser_id,permission,assigned_at");
    return {
      items: (data || []).map((item) => ({
        id: item.id,
        marketerId: item.marketer_id,
        advertiserId: item.advertiser_id,
        permission: item.permission,
        assignedAt: item.assigned_at
      }))
    };
  }
  return { items: mockAssignments };
}

export async function assignAdvertiserToMarketer(marketerId, advertiserId, permission = "manage") {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("pm_marketer_advertisers")
      .insert({ marketer_id: marketerId, advertiser_id: advertiserId, permission })
      .select("id,marketer_id,advertiser_id,permission,assigned_at")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, assignment: data };
  }
  const assignment = {
    id: `asg_mock_${assignmentSequence++}`,
    marketerId,
    advertiserId,
    permission,
    assignedAt: "2026-05-27 09:00"
  };
  mockAssignments = [assignment, ...mockAssignments.filter((item) => !(item.marketerId === marketerId && item.advertiserId === advertiserId))];
  return { ok: true, assignment };
}

export async function removeAdvertiserAssignment(assignmentId) {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("pm_marketer_advertisers").delete().eq("id", assignmentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  mockAssignments = mockAssignments.filter((item) => item.id !== assignmentId);
  return { ok: true };
}

export async function createAdvertiserWithAccount(payload, currentUser) {
  const clientId = `pm-${slugify(payload.name)}-${String(advertiserSequence).padStart(3, "0")}`;
  const projectKey = generateProjectKey(payload.name);
  const advertiserId = `adv_${String(advertiserSequence).padStart(3, "0")}`;
  const advertiserUserId = `user_client_${String(advertiserSequence).padStart(3, "0")}`;
  const advertiserUserLinkId = `adu_${String(advertiserUserSequence++).padStart(3, "0")}`;
  advertiserSequence += 1;

  if (hasSupabaseConfig()) {
    return {
      ok: false,
      error: "실제 Supabase 사용자 생성은 service role key가 필요한 서버 API에서 처리해야 합니다."
    };
  }

  const advertiser = {
    id: advertiserId,
    name: payload.name,
    clientId,
    projectKey,
    siteUrl: payload.siteUrl,
    status: payload.status,
    createdBy: currentUser.id
  };
  const advertiserUser = {
    id: advertiserUserId,
    email: payload.loginEmail,
    name: payload.contactName,
    role: "advertiser",
    team: payload.name,
    isActive: payload.status === "active"
  };
  const advertiserUserLink = {
    id: advertiserUserLinkId,
    userId: advertiserUserId,
    advertiserId,
    permission: payload.permission,
    createdBy: currentUser.id,
    isActive: true,
    inviteLink: `https://app.progressmedia.example/invite/${advertiserUserLinkId}`,
    temporaryPassword: "Temp!2026"
  };
  const assignment = {
    id: `asg_mock_${assignmentSequence++}`,
    marketerId: currentUser.id,
    advertiserId,
    permission: "manage",
    assignedAt: "2026-05-27 09:00"
  };

  mockAdvertisers = [advertiser, ...mockAdvertisers];
  mockUsers = [advertiserUser, ...mockUsers];
  mockAdvertiserUsers = [advertiserUserLink, ...mockAdvertiserUsers];
  mockAssignments = [assignment, ...mockAssignments];

  return {
    ok: true,
    advertiser,
    advertiserUser,
    advertiserUserLink,
    assignment,
    installScript: generateInstallScript(clientId, projectKey)
  };
}

export async function fetchAdvertiserUsers(user) {
  if (!user) return { items: [] };
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("pm_advertiser_users")
      .select("id,user_id,advertiser_id,permission,created_by,created_at,profile:pm_profiles(id,email,name,is_active)")
      .order("created_at", { ascending: false });
    return {
      items: (data || []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        advertiserId: item.advertiser_id,
        permission: item.permission,
        createdBy: item.created_by,
        email: item.profile?.email,
        name: item.profile?.name,
        isActive: item.profile?.is_active !== false
      }))
    };
  }

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
  if (hasSupabaseConfig()) {
    return {
      ok: false,
      error: "실제 광고주 Auth 계정 생성은 service role key가 필요한 서버 API에서 처리해야 합니다."
    };
  }
  const id = `adu_${String(advertiserUserSequence++).padStart(3, "0")}`;
  const userId = `user_client_${id}`;
  const profile = {
    id: userId,
    email: payload.email,
    name: payload.name,
    role: "advertiser",
    team: payload.advertiserName || "광고주",
    isActive: true
  };
  const row = {
    id,
    userId,
    advertiserId: payload.advertiserId,
    permission: payload.permission,
    createdBy: currentUser.id,
    isActive: true,
    inviteLink: `https://app.progressmedia.example/invite/${id}`,
    temporaryPassword: "Temp!2026"
  };
  mockUsers = [profile, ...mockUsers];
  mockAdvertiserUsers = [row, ...mockAdvertiserUsers];
  return { ok: true, user: profile, advertiserUser: row };
}

export async function updateAdvertiserUserPermission(advertiserUserId, permission) {
  mockAdvertiserUsers = mockAdvertiserUsers.map((item) => item.id === advertiserUserId ? { ...item, permission } : item);
  return { ok: true };
}

export async function deactivateAdvertiserUser(advertiserUserId) {
  const target = mockAdvertiserUsers.find((item) => item.id === advertiserUserId);
  mockAdvertiserUsers = mockAdvertiserUsers.map((item) => item.id === advertiserUserId ? { ...item, isActive: false } : item);
  if (target) {
    mockUsers = mockUsers.map((user) => user.id === target.userId ? { ...user, isActive: false } : user);
  }
  return { ok: true };
}

export async function fetchClickLogs(filters = {}) {
  return { items: clickLogs, total: clickLogs.length, filters };
}

export async function fetchClickDashboard(logs = clickLogs) {
  return {
    summary: summarizeClicks(logs),
    advertiserStats: getAdvertiserStats(logs),
    mediaStats: getMediaStats(logs),
    hourlyTrend: getHourlyTrend(logs)
  };
}

export async function fetchAdvertiserReports(logs = clickLogs) {
  return {
    summary: summarizeClicks(logs),
    advertisers: getAdvertiserStats(logs),
    media: getMediaStats(logs),
    hourly: getHourlyTrend(logs)
  };
}

export async function fetchBlockRules() {
  return { items: getBlockRules() };
}

export async function createManualBlock(payload) {
  return {
    ok: true,
    block: {
      id: "mock-block-001",
      method: "manual",
      createdAt: "2026-05-27 14:30",
      ...payload
    }
  };
}

export async function removeBlock(blockId) {
  return { ok: true, releasedBlockId: blockId, releasedAt: "2026-05-27 14:30" };
}

export async function fetchAdvertisers() {
  return { items: mockAdvertisers };
}

export async function createAdvertiser(payload) {
  const id = "adv_mock_001";
  return { ok: true, advertiser: { id, clientId: `pm-${id}`, status: "active", ...payload } };
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
