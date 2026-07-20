import { NextRequest, NextResponse } from "next/server";
import { getSession, auditLog } from "@/lib/auth";
import { db } from "@/lib/db";

// 임퍼소네이션 중 쓰기 모드 토글 — operator 전용. 켤 때마다 감사로그 기록.
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (s.role !== "operator") return NextResponse.json({ error: "운영자만 사용할 수 있습니다." }, { status: 403 });
  if (!s.impersonatedStoreId) return NextResponse.json({ error: "임퍼소네이션 중에만 사용할 수 있습니다." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const enabled = (body as { enabled?: boolean }).enabled === true;

  await db.execute({
    sql: "UPDATE sellfit_sessions SET readonly = ? WHERE id = ?",
    args: [enabled ? 0 : 1, s.sessionId],
  });
  await auditLog({ userId: s.userId, email: s.email }, enabled ? "write_mode_on" : "write_mode_off", {
    storeId: s.impersonatedStoreId,
  });

  return NextResponse.json({ ok: true, readonly: !enabled });
}
