export default function SellFitFooter() {
  return (
    <footer style={{ background: "#1A1A1A", fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <div style={{ padding: "56px 48px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "40px" }}>

          {/* Col 1: Branding */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "5px", background: "#D4537E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "11px" }}>🛍</span>
              </div>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>SELLFIT</span>
            </div>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 10px", lineHeight: 1.5 }}>
              판단은 셀러가, 준비는 AI가
            </p>
            <p style={{ fontSize: "12px", color: "#555", margin: 0, lineHeight: 1.7 }}>
              스마트스토어 셀러를 위한<br />
              AI 상품 발굴 & 채널 매칭 시스템
            </p>
          </div>

          {/* Col 2: About Us */}
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>About Us</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {["Aiges Pontos", "SellFit", "AI 큐레이션 시스템"].map(item => (
                <li key={item} style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "10px", lineHeight: 1.4 }}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Col 3: Demo Info */}
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>주요 기능</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {["12개월 시즌 보드", "AI 제안 · 사람 결정", "정산 · 발주 자동화"].map(item => (
                <li key={item} style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "10px", lineHeight: 1.4 }}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>Contact</p>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 8px", lineHeight: 1.5 }}>도입 문의</p>
            <a href="mailto:jae@pontos.kr" style={{ fontSize: "12px", color: "#9ca3af", margin: 0, lineHeight: 1.6, textDecoration: "none" }}>jae@pontos.kr</a>
          </div>

        </div>
      </div>

      {/* Divider + copyright */}
      <div style={{ borderTop: "1px solid #2a2a2a" }}>
        <div style={{ padding: "20px 48px" }}>
          <p style={{ fontSize: "12px", color: "#444", margin: 0, textAlign: "center", letterSpacing: "0.02em" }}>
            Published by Aiges Pontos · 완벽보다 함께함 · © 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
