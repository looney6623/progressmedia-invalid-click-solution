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

export const mockAdvertisers = [
  { id: "adv_001", name: "샤브20", clientId: "pm-shabu20", status: "active" },
  { id: "adv_002", name: "3분페이", clientId: "pm-3minpay", status: "active" },
  { id: "adv_003", name: "대주바이오", clientId: "pm-daejoo-bio", status: "active" },
  { id: "adv_004", name: "바른숨병원", clientId: "pm-hospital", status: "active" },
  { id: "adv_005", name: "온리원쇼핑몰", clientId: "pm-onlyone-shop", status: "active" }
];

const mockUsers = [
  { id: "user_admin", email: "admin@progressmedia.co.kr", name: "관리자", role: "admin", team: "운영관리", isActive: true },
  { id: "user_marketer_1", email: "marketer1@progressmedia.co.kr", name: "윤인홍", role: "marketer", team: "퍼포먼스1팀", isActive: true },
  { id: "user_marketer_2", email: "marketer2@progressmedia.co.kr", name: "마케터B", role: "marketer", team: "퍼포먼스2팀", isActive: true }
];

let mockAssignments = [
  { id: "asg_001", marketerId: "user_marketer_1", advertiserId: "adv_001", permission: "manage", assignedAt: "2026-05-27 09:00" },
  { id: "asg_002", marketerId: "user_marketer_1", advertiserId: "adv_002", permission: "manage", assignedAt: "2026-05-27 09:00" },
  { id: "asg_003", marketerId: "user_marketer_2", advertiserId: "adv_003", permission: "manage", assignedAt: "2026-05-27 09:00" },
  { id: "asg_004", marketerId: "user_marketer_2", advertiserId: "adv_004", permission: "view", assignedAt: "2026-05-27 09:00" }
];

function browserStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function buildInstallScript(clientId) {
  return `<script>
(function(w,d,s,u,c){
  w.pmInvalidClick=w.pmInvalidClick||function(){(w.pmInvalidClick.q=w.pmInvalidClick.q||[]).push(arguments)};
  w.pmInvalidClick("init",{clientId:c});
  var js=d.createElement(s); js.async=true; js.src=u;
  d.head.appendChild(js);
})(window,document,"script","https://cdn.progressmedia.co.kr/invalid-click.js","${clientId}");
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

export function isSupabaseAuthEnabled() {
  return hasSupabaseConfig();
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
      role: "marketer",
      team: "",
      isActive: true
    };
  }

  const storedEmail = browserStorage()?.getItem(MOCK_SESSION_KEY);
  return mockUsers.find((user) => user.email === storedEmail) || null;
}

export async function signInWithEmail(email, password) {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: await fetchCurrentUser() };
  }

  const user = mockUsers.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { ok: false, error: "등록되지 않은 mock 계정입니다." };
  }
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

export async function fetchMyAdvertisers(user) {
  if (!user) return { items: [] };
  if (hasSupabaseConfig()) {
    if (user.role === "admin") {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("pm_advertisers").select("id,name,client_id,status").order("name");
      return { items: (data || []).map((item) => ({ id: item.id, name: item.name, clientId: item.client_id, status: item.status })) };
    }
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("pm_marketer_advertisers")
      .select("advertiser:pm_advertisers(id,name,client_id,status),permission")
      .eq("marketer_id", user.id);
    return {
      items: (data || []).map((item) => ({
        id: item.advertiser.id,
        name: item.advertiser.name,
        clientId: item.advertiser.client_id,
        status: item.advertiser.status,
        permission: item.permission
      }))
    };
  }

  if (user.role === "admin") return { items: mockAdvertisers };
  const advertiserIds = mockAssignments.filter((item) => item.marketerId === user.id).map((item) => item.advertiserId);
  return { items: mockAdvertisers.filter((advertiser) => advertiserIds.includes(advertiser.id)) };
}

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
    id: `asg_mock_${mockAssignments.length + 1}`,
    marketerId,
    advertiserId,
    permission,
    assignedAt: "2026-05-27 09:00"
  };
  mockAssignments = [assignment, ...mockAssignments];
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

export async function fetchClickLogs(filters = {}) {
  return {
    items: clickLogs,
    total: clickLogs.length,
    filters
  };
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
  return {
    items: getBlockRules()
  };
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
  return {
    ok: true,
    releasedBlockId: blockId,
    releasedAt: "2026-05-27 14:30"
  };
}

export async function fetchAdvertisers() {
  return {
    items: mockAdvertisers
  };
}

export async function createAdvertiser(payload) {
  const id = "adv_mock_001";
  return {
    ok: true,
    advertiser: {
      id,
      clientId: `pm-${id}`,
      status: "active",
      ...payload
    }
  };
}

export async function fetchInstallScript(advertiserId) {
  const advertiser = mockAdvertisers.find((item) => item.id === advertiserId) || mockAdvertisers[0];
  return {
    advertiserId: advertiser.id,
    clientId: advertiser.clientId,
    installStatus: "mock",
    lastSeenAt: null,
    script: buildInstallScript(advertiser.clientId)
  };
}
