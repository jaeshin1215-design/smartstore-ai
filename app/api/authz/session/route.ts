import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// 현재 세션 상태 (UI 배너·스토어 전환기용). 읽기 전용.
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ authenticated: false }, { status: 401 });

  let storeName = "";
  try {
    const r = await db.execute({ sql: "SELECT name FROM sellfit_stores WHERE id = ?", args: [s.storeId] });
    storeName = String(r.rows[0]?.name ?? "");
  } catch { /* 이름 없어도 동작 */ }

  return NextResponse.json({
    authenticated: true,
    email: s.email,
    role: s.role,
    storeId: s.storeId,
    storeName,
    defaultStoreId: s.defaultStoreId,
    impersonating: !!s.impersonatedStoreId,
    impersonatedStoreId: s.impersonatedStoreId,
    impersonatedUntil: s.impersonatedUntil,
    readonly: s.readonly,
  });
}
