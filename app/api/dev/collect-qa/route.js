import { NextResponse } from "next/server";
import { detectInvalidClick } from "@/lib/serverInvalidClick";
import { isServerLocalMode, serverMode } from "@/lib/serverSupabase";

export const dynamic = "force-dynamic";

function json(body, init = {}) {
  return NextResponse.json(body, init);
}

function isQaEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEV_QA_ENABLED === "true";
}

class FakeQuery {
  constructor(table, state) {
    this.table = table;
    this.state = state;
  }

  select(_columns, options = {}) {
    this.options = options;
    return this;
  }

  eq() {
    return this;
  }

  gte() {
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle() {
    if (this.table === "pm_blocked_ips") {
      return Promise.resolve({ data: this.state.activeBlock || null, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }

  result() {
    if (this.table === "pm_block_rules") {
      return { data: this.state.rules || [], error: null };
    }
    if (this.table === "pm_click_logs") {
      return { count: this.state.previousClicks || 0, error: null };
    }
    return { data: null, error: null };
  }

  then(resolve, reject) {
    return Promise.resolve(this.result()).then(resolve, reject);
  }
}

function createFakeSupabase(state) {
  return {
    from(table) {
      return new FakeQuery(table, state);
    }
  };
}

const scenarios = {
  blocking_disabled_repeat: {
    description: "blocking_enabled=false이면 반복 클릭, 짧은 체류, 무이동 세션이 승격되지 않습니다.",
    state: { previousClicks: 4 },
    input: { blockingEnabled: false, stayTime: 1, pageCount: 0 },
    expect: { click_status: "normal", reasonIncludes: "자동 차단 중지 상태", appliedRules: [] }
  },
  blocking_disabled_active_block: {
    description: "blocking_enabled=false여도 활성 차단 IP는 즉시 blocked가 됩니다.",
    state: {
      previousClicks: 0,
      activeBlock: { id: "block-qa", reason: "QA 활성 차단 IP", block_type: "manual", source: "qa" }
    },
    input: { blockingEnabled: false, stayTime: 1, pageCount: 0 },
    expect: { click_status: "blocked", reasonIncludes: "활성 차단 IP", appliedRule: "active_blocked_ip" }
  },
  blocking_enabled_repeat_block: {
    description: "blocking_enabled=true이면 10분 내 5회 반복 클릭이 blocked로 승격됩니다.",
    state: { previousClicks: 4 },
    input: { blockingEnabled: true, stayTime: 1, pageCount: 0 },
    expect: { click_status: "blocked", appliedRule: "repeat_click_block" }
  }
};

function evaluate(result, expect) {
  const appliedRuleKeys = (result.applied_rules || []).map((rule) => rule.rule_key);
  return {
    clickStatus: result.click_status === expect.click_status,
    reason: expect.reasonIncludes ? result.reason.includes(expect.reasonIncludes) : true,
    appliedRules: expect.appliedRules ? appliedRuleKeys.length === expect.appliedRules.length : true,
    appliedRule: expect.appliedRule ? appliedRuleKeys.includes(expect.appliedRule) : true
  };
}

async function runScenario(name, scenario) {
  const result = await detectInvalidClick({
    supabase: createFakeSupabase(scenario.state),
    advertiserId: "adv-qa",
    ipHash: "ip-hash-qa",
    stayTime: scenario.input.stayTime,
    pageCount: scenario.input.pageCount,
    blockingEnabled: scenario.input.blockingEnabled
  });
  const checks = evaluate(result, scenario.expect);
  return {
    name,
    description: scenario.description,
    input: scenario.input,
    expect: scenario.expect,
    pass: Object.values(checks).every(Boolean),
    checks,
    result: {
      click_status: result.click_status,
      risk_score: result.risk_score,
      reason: result.reason,
      recent_count: result.recent_count,
      matched_block: Boolean(result.matched_block),
      applied_rules: result.applied_rules,
      auto_block_create: result.auto_block_create
    }
  };
}

export async function GET(request) {
  if (!isQaEnabled() || !isServerLocalMode()) {
    return new Response(null, { status: 404 });
  }

  const scenarioName = new URL(request.url).searchParams.get("scenario");
  const names = scenarioName ? [scenarioName] : Object.keys(scenarios);
  const unknown = names.find((name) => !scenarios[name]);
  if (unknown) return json({ ok: false, error: `unknown scenario: ${unknown}` }, { status: 400 });

  const results = await Promise.all(names.map((name) => runScenario(name, scenarios[name])));
  return json({
    ok: results.every((item) => item.pass),
    mode: serverMode(),
    scenarios: results
  });
}
