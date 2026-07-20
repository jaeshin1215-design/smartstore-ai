import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// 진입 가능한 스토어 목록.
//   operator → 활성 스토어 전체 (임퍼소네이션 대상)
//   member   → 자기 멤버십 스토어만
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  if (s.role === "operator") {
    const r = await db.execute("SELECT id, name FROM sellfit_stores WHERE status = 'active' ORDER BY name");
    return NextResponse.json({
      mode: "operator",
      stores: r.rows.map(x => ({ id: String(x.id), name: String(x.name ?? ""), via: "impersonate" })),
    });
  }

  const r = await db.execute({
    sql: `SELECT st.id, st.name, m.role
          FROM sellfit_store_members m JOIN sellfit_stores st ON st.id = m.store_id
          WHERE m.user_id = ? AND st.status = 'active' ORDER BY st.name`,
    args: [s.userId],
  });
  return NextResponse.json({
    mode: "member",
    stores: r.rows.map(x => ({ id: String(x.id), name: String(x.name ?? ""), role: String(x.role ?? "staff"), via: "membership" })),
  });
}
