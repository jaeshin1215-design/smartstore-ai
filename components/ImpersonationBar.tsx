"use client";

import { useEffect, useState, useCallback } from "react";

interface SessionState {
  authenticated: boolean;
  email?: string;
  role?: string;
  storeId?: string;
  storeName?: string;
  impersonating?: boolean;
  impersonatedUntil?: number | null;
  readonly?: boolean;
}
interface StoreOpt { id: string; name: string; via: string }

// 운영자 임퍼소네이션 바 — 상시 경고 배너 + 스토어 전환기.
// operator 가 아니거나 비로그인이면 아무것도 렌더하지 않는다.
export default function ImpersonationBar() {
  const [s, setS] = useState<SessionState | null>(null);
  const [stores, setStores] = useState<StoreOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/authz/session");
      if (!r.ok) { setS(null); return; }
      const j = (await r.json()) as SessionState;
      setS(j);
      if (j.role === "operator") {
        const rs = await fetch("/api/authz/stores");
        if (rs.ok) setStores(((await rs.json()) as { stores: StoreOpt[] }).stores ?? []);
      }
    } catch { setS(null); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  if (!s?.authenticated || s.role !== "operator") return null;

  const remainMin = s.impersonatedUntil ? Math.max(0, Math.round((s.impersonatedUntil - now) / 60000)) : null;

  async function start(storeId: string) {
    if (!storeId) return;
    setBusy(true);
    try { await fetch("/api/authz/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ store_id: storeId }) }); await load(); }
    finally { setBusy(false); }
  }
  async function end() {
    setBusy(true);
    try { await fetch("/api/authz/impersonate", { method: "DELETE" }); await load(); }
    finally { setBusy(false); }
  }
  async function toggleWrite(enabled: boolean) {
    setBusy(true);
    try { await fetch("/api/authz/write-mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }); await load(); }
    finally { setBusy(false); }
  }

  const bg = s.impersonating ? (s.readonly ? "#7c2d12" : "#991b1b") : "#1f2937";

  return (
    <div style={{ background: bg, color: "#fff", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, fontFamily: "'Pretendard', sans-serif" }}>
      <span style={{ fontWeight: 700, letterSpacing: "0.02em" }}>운영자</span>
      {s.impersonating ? (
        <>
          <span>
            <b>{s.storeName || s.storeId}</b> 데이터를 열람 중
            {s.readonly ? " · 읽기 전용" : " · ⚠ 쓰기 모드"}
            {remainMin != null && ` · 남은 시간 ${remainMin}분`}
          </span>
          <button onClick={() => toggleWrite(!!s.readonly)} disabled={busy}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 4, padding: "3px 10px", fontSize: 12, cursor: busy ? "wait" : "pointer" }}>
            {s.readonly ? "쓰기 모드 켜기" : "읽기 전용으로"}
          </button>
          <button onClick={end} disabled={busy}
            style={{ background: "#fff", color: "#111", border: "none", borderRadius: 4, padding: "3px 12px", fontSize: 12, fontWeight: 600, cursor: busy ? "wait" : "pointer" }}>
            열람 종료
          </button>
        </>
      ) : (
        <>
          <span style={{ opacity: 0.8 }}>고객 스토어 열람 (읽기 전용으로 시작)</span>
          <select defaultValue="" disabled={busy} onChange={e => start(e.target.value)}
            style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.35)", background: "#fff", color: "#111" }}>
            <option value="">스토어 선택…</option>
            {stores.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </>
      )}
    </div>
  );
}
