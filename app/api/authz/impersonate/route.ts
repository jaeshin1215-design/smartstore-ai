import { NextRequest, NextResponse } from "next/server";
import { getSession, auditLog } from "@/lib/auth";
import { db } from "@/lib/db";

const IMPERSONATE_MS = 2 * 60 * 60 * 1000; // 2시간

// 임퍼소네이션 시작 — operator 전용. 기본 읽기전용.
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (s.role !== "operator") return NextResponse.json({ error: "운영자만 사용할 수 있습니다." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const storeId = String((body as { store_id?: string }).store_id ?? "").trim();
  if (!storeId) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  const st = await db.execute({ sql: "SELECT id, name, status FROM sellfit_stores WHERE id = ?", args: [storeId] });
  const store = st.rows[0];
  if (!store) return NextResponse.json({ error: "존재하지 않는 스토어" }, { status: 404 });
  if (String(store.status) !== "active") return NextResponse.json({ error: "보관(archived) 스토어" }, { status: 400 });

  const until = Date.now() + IMPERSONATE_MS;
  await db.execute({
    sql: `UPDATE sellfit_sessions
          SET active_store_id = ?, impersonated_store_id = ?, impersonated_until = ?, readonly = 1
          WHERE id = ?`,
    args: [storeId, storeId, until, s.sessionId],
  });
  await auditLog({ userId: s.userId, email: s.email }, "impersonate_start", {
    storeId, target: String(store.name ?? ""), meta: { until, readonly: true },
  });

  return NextResponse.json({ ok: true, storeId, storeName: String(store.name ?? ""), until, readonly: true });
}

// 임퍼소네이션 종료 — 기본 스토어로 복귀
export async function DELETE(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  await db.execute({
    sql: `UPDATE sellfit_sessions
          SET active_store_id = NULL, impersonated_store_id = NULL, impersonated_until = NULL, readonly = 0
          WHERE id = ?`,
    args: [s.sessionId],
  });
  await auditLog({ userId: s.userId, email: s.email }, "impersonate_end", {
    storeId: s.impersonatedStoreId ?? s.storeId,
  });

  return NextResponse.json({ ok: true, storeId: s.defaultStoreId });
}
