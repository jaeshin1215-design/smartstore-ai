"use client";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const EVENTS = [
  { emoji: "🍞", label: "빵력장터 행사 참여", date: "2026.05", type: "행사" },
  { emoji: "🏃", label: "MOVFLEX 1유로프로젝트 팝업", date: "2024.12", type: "팝업" },
  { emoji: "🎤", label: "라이콘 오디션", date: "2024", type: "이벤트" },
  { emoji: "📋", label: "정책 세미나", date: "2024", type: "세미나" },
  { emoji: "🎈", label: "어린이날 행사", date: "2024", type: "행사" },
];

const FILTERS = [
  { icon: "◆", text: "D2C only — 유통 없이 직판", muted: false },
  { icon: "◆", text: "팔로워 5천~2만 (과대·과소 제외)", muted: false },
  { icon: "◆", text: "오프라인 쇼룸 없음 (공간 목마름)", muted: false },
  { icon: "◆", text: "팝업·플리마켓 이력 3~6개월", muted: false },
  { icon: "◆", text: "서북권 밀착 또는 인증샷 파급력", muted: false },
  { icon: "◆", text: "콜라보 마켓 참여 잦음", muted: false },
  { icon: "✕", text: "F&B 제외 (공간 특성상)", muted: true },
];

const chip = (text: string, color = "#1d4ed8", bg = "#eff6ff", border = "#bfdbfe") => (
  <span style={{
    fontSize: "11px", fontWeight: 500,
    padding: "2px 9px", borderRadius: "6px",
    background: bg, border: `1px solid ${border}`, color,
    whiteSpace: "nowrap",
  }}>{text}</span>
);

export default function SetupTab() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "200px minmax(0,720px)",
      gap: "0 25vw",
      fontFamily: FF,
    }}>

      {/* ── 좌: 발굴 필터 사이드바 (Optimize left sidebar 1:1) ── */}
      <div style={{
        background: "#F7F8FA",
        borderRadius: "8px",
        padding: "14px 12px",
        borderRight: "1px solid #e8eaed",
      }}>
        <p style={{
          fontSize: "10px", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: "#9ca3af", marginBottom: "8px",
        }}>
          SPACE INTEL
        </p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>
          브랜드<br />발굴 필터
        </p>
        <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>
          유명세가 아니라<br />"지금 공간이 아쉬운"<br />브랜드를 거릅니다.
        </p>

        {FILTERS.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: "5px",
            marginBottom: "7px", opacity: f.muted ? 0.6 : 1,
          }}>
            <span style={{
              fontSize: "10px", fontWeight: 700,
              color: f.muted ? "#ef4444" : "#c0c4cc",
              flexShrink: 0, marginTop: "1px",
            }}>{f.icon}</span>
            <span style={{ fontSize: "11px", color: f.muted ? "#9ca3af" : "#8f9399", lineHeight: 1.45 }}>
              {f.text}
            </span>
          </div>
        ))}

        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
          <p style={{
            fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "8px",
          }}>결과</p>
          <p style={{ fontSize: "11px", color: "#3b4fd8", fontWeight: 700, margin: "0 0 4px 0" }}>
            → 7개 후보 발굴
          </p>
          <p style={{ fontSize: "10px", color: "#6272c4", margin: 0, lineHeight: 1.5 }}>
            Diagnose 매트릭스<br />배치 완료
          </p>
        </div>
      </div>

      {/* ── 우: 공간 DNA + 행사이력 ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* 공간 인포 카드 */}
        <div style={{
          background: "#ffffff", border: "1px solid #e8eaed",
          borderRadius: "10px", padding: "24px 28px",
        }}>
          <p style={{
            fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "14px",
          }}>
            📍 공간 프로필
          </p>
          <h2 style={{
            fontSize: "22px", fontWeight: 800, color: "#0d0d0e",
            margin: "0 0 4px 0", letterSpacing: "-0.02em",
          }}>
            메자닌 북가좌
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px 0" }}>
            서울 서대문구 증산역 인근
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
            {chip("A·B·C 3개 동")}
            {chip("약 350평", "#1d4ed8", "#eff6ff", "#bfdbfe")}
            {chip("복합문화공간", "#6d28d9", "#f5f3ff", "#ddd6fe")}
          </div>
          <div style={{
            padding: "14px 16px", background: "#f9fafb",
            borderRadius: "8px", border: "1px solid #e8eaed",
          }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#64676b", margin: "0 0 6px 0" }}>
              엔진의 읽기 방식
            </p>
            <p style={{ fontSize: "12px", color: "#4a4f57", lineHeight: 1.65, margin: 0 }}>
              다녀간 행사를 역산해 이 공간의 성격을 읽었습니다.<br />
              무엇이 어울렸는지·무엇이 사람을 불렀는지가 입력값입니다.
            </p>
          </div>
        </div>

        {/* 행사 이력 카드 */}
        <div style={{
          background: "#ffffff", border: "1px solid #e8eaed",
          borderRadius: "10px", padding: "24px 28px",
        }}>
          <p style={{
            fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "14px",
          }}>
            ★ 공간의 실증 이력 (엔진의 입력)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {EVENTS.map((ev, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 14px",
                background: "#fafafa", borderRadius: "7px",
                border: "1px solid #f0f0f0",
              }}>
                <span style={{ fontSize: "18px", flexShrink: 0 }}>{ev.emoji}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>
                    {ev.label}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                  <span style={{
                    fontSize: "10px", padding: "1px 7px", borderRadius: "5px",
                    background: "#f0f4ff", color: "#3b4fd8",
                    border: "1px solid #c7d2fe", fontWeight: 600,
                  }}>
                    {ev.type}
                  </span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>{ev.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
