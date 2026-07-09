// SellFit 인증 — 이메일 매직링크 + 서명 세션 쿠키 (2026-07-09)
// 쿠키 형식: {sessionId}.{expiresAtMs}.{hmacHex}
//   - middleware(엣지)는 서명·만료만 검증 (DB 접근 없음)
//   - 라우트(노드)는 getSession()으로 DB 대조 → user·store_id 확정 (스토어 스코핑)
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { db } from "./db";

export const SESSION_COOKIE = "sellfit_session";
const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET 미설정");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** 세션 생성 → 쿠키 값 반환 */
export async function createSession(userId: string): Promise<{ cookieValue: string; expiresAtMs: number }> {
  const id = randomBytes(24).toString("hex");
  const expiresAtMs = Date.now() + SESSION_DAYS * 86400000;
  await db.execute({
    sql: "INSERT INTO sellfit_sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    args: [id, userId, expiresAtMs],
  });
  const payload = `${id}.${expiresAtMs}`;
  return { cookieValue: `${payload}.${sign(payload)}`, expiresAtMs };
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  email: string;
  storeId: string;
}

/** 쿠키 → 서명·만료·DB 검증 → 세션 정보. 실패 시 null */
export async function getSession(req: NextRequest): Promise<SessionInfo | null> {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [sid, expStr, sig] = parts;

  const expected = sign(`${sid}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(expStr) || Number(expStr) < Date.now()) return null;

  const r = await db.execute({
    sql: `SELECT s.id AS sid, u.id AS uid, u.email, u.store_id
          FROM sellfit_sessions s JOIN sellfit_users u ON u.id = s.user_id
          WHERE s.id = ? AND s.expires_at > ?`,
    args: [sid, Date.now()],
  });
  const row = r.rows[0];
  if (!row) return null;
  return {
    sessionId: String(row.sid),
    userId: String(row.uid),
    email: String(row.email),
    storeId: String(row.store_id),
  };
}

/**
 * 스토어 스코핑 — 클라이언트가 보낸 store 파라미터를 신뢰하지 않는다.
 * 세션이 있으면 세션의 store_id를 반환 (멀티테넌트 첫 단추).
 * 확장 토큰 요청(세션 없음)만 명시적 파라미터를 허용.
 */
export async function resolveStoreId(req: NextRequest, fallbackParam?: string | null): Promise<string | null> {
  const session = await getSession(req);
  if (session) return session.storeId;
  if (req.headers.get("x-extension-token") === process.env.EXTENSION_TOKEN && process.env.EXTENSION_TOKEN) {
    return fallbackParam ?? null;
  }
  return null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM sellfit_sessions WHERE id = ?", args: [sessionId] });
}
