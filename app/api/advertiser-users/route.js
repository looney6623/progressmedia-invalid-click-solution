import { NextResponse } from "next/server";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

export async function POST(request) {
  const body = await request.json();
  const required = ["advertiserId", "name", "email", "permission", "createdBy"];
  const missing = required.filter((key) => !body[key]);
  if (missing.length) return NextResponse.json({ ok: false, error: `필수값이 없습니다: ${missing.join(", ")}` }, { status: 400 });

  if (!hasServerSupabaseConfig()) {
    const id = `mock-${crypto.randomUUID().slice(0, 8)}`;
    const status = isServerLocalMode() ? 200 : 503;
    return NextResponse.json({
      ok: isServerLocalMode(),
      mode: serverMode(),
      todo: "Supabase service role 연결 후 auth.admin.createUser, pm_profiles, pm_advertiser_users 저장을 수행합니다.",
      user: { id: `user-${id}`, email: body.email, name: body.name, role: "advertiser" },
      advertiserUser: { id, userId: `user-${id}`, advertiserId: body.advertiserId, permission: body.permission, createdBy: body.createdBy, temporaryPassword: body.temporaryPassword },
      error: isServerLocalMode() ? undefined : "운영 모드에서는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
    }, { status });
  }

  const supabase = createSupabaseServiceClient();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.temporaryPassword,
    email_confirm: true,
    user_metadata: { name: body.name, role: "advertiser" }
  });
  if (authError) return NextResponse.json({ ok: false, error: authError.message }, { status: 500 });

  await supabase.from("pm_profiles").upsert({
    id: authData.user.id,
    email: body.email,
    name: body.name,
    role: "advertiser",
    team: body.advertiserName || "",
    is_active: true
  });

  const { data: link, error: linkError } = await supabase
    .from("pm_advertiser_users")
    .insert({
      user_id: authData.user.id,
      advertiser_id: body.advertiserId,
      permission: body.permission,
      created_by: body.createdBy
    })
    .select("id,user_id,advertiser_id,permission,created_by")
    .single();

  if (linkError) return NextResponse.json({ ok: false, error: linkError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    user: { id: authData.user.id, email: body.email, name: body.name, role: "advertiser" },
    advertiserUser: { id: link.id, userId: link.user_id, advertiserId: link.advertiser_id, permission: link.permission, createdBy: link.created_by }
  });
}
