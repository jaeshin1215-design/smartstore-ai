import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이지스토리 압축팩 — 캐리어 공간 30% 더",
  description: "1초 압축으로 캐리어 공간 30% 확보. 여행 필수 아이템.",
};

const STORE_BASE = "https://smartstore.naver.com/YOUR_STORE_LINK";

export default function BagLandingPage({
  searchParams,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchParams: any;
}) {
  const src = (searchParams?.src as string) || "";
  const STORE_URL = src
    ? `${STORE_BASE}?utm_source=instagram&utm_medium=reel&utm_campaign=poc_01&utm_content=${encodeURIComponent(src)}`
    : STORE_BASE;
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d0d",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
      color: "#ffffff",
    }}>

      {/* 모바일 중앙 컨테이너 */}
      <div style={{ maxWidth: "390px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* 히어로 */}
        <section style={{ padding: "48px 24px 32px", textAlign: "center" }}>

          {/* AI 생성 배지 */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "20px" }}>
            <span style={{
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
              background: "rgba(239,86,124,0.12)", border: "1px solid rgba(239,86,124,0.3)",
              color: "#ef567c", padding: "3px 10px", borderRadius: "20px",
            }}>
              ⚡ AI 생성
            </span>
            <span style={{
              fontSize: "10px", fontWeight: 600, color: "#4a4f57",
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              padding: "3px 10px", borderRadius: "20px",
            }}>
              이지스토리 공식
            </span>
          </div>

          {/* 메인 헤드라인 */}
          <h1 style={{
            fontSize: "38px", fontWeight: 900, lineHeight: 1.15,
            letterSpacing: "-0.02em", marginBottom: "12px",
          }}>
            캐리어 공간<br />
            <span style={{ color: "#ef567c" }}>30% 더</span>
          </h1>

          <p style={{
            fontSize: "16px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "28px",
          }}>
            1초 압축으로<br />짐이 반으로 줄어드는 경험
          </p>

          {/* 이미지 영역 placeholder */}
          <div style={{
            width: "100%", aspectRatio: "9/10",
            background: "#1a1a1a",
            border: "1px dashed #2a2a2a",
            borderRadius: "16px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "8px",
            marginBottom: "28px",
          }}>
            <span style={{ fontSize: "32px" }}>📦</span>
            <p style={{ fontSize: "11px", color: "#4a4f57", textAlign: "center", lineHeight: 1.6 }}>
              [압축팩 실사용 영상·이미지 영역]<br />
              트랙 1 영상 완성 후 삽입 예정
            </p>
          </div>

          {/* CTA 버튼 */}
          <a
            href={STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", width: "100%",
              padding: "18px",
              background: "#ef567c",
              color: "white",
              fontSize: "17px", fontWeight: 800,
              textAlign: "center", textDecoration: "none",
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(239,86,124,0.35)",
              letterSpacing: "-0.01em",
            }}
          >
            지금 구매하기 →
          </a>
          <p style={{ fontSize: "11px", color: "#4a4f57", marginTop: "10px" }}>
            스마트스토어 · 네이버페이 결제
          </p>
        </section>

        {/* 신뢰 지표 */}
        <section style={{ padding: "0 24px 32px" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
          }}>
            {[
              { label: "구매자", value: "—", note: "[실제 건수 입력]" },
              { label: "별점", value: "⭐⭐⭐⭐⭐", note: "[실측 평점]" },
              { label: "재구매율", value: "—", note: "[실측 데이터]" },
            ].map((item, i) => (
              <div key={i} style={{
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: "12px", padding: "14px 10px", textAlign: "center",
              }}>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                  {item.value}
                </p>
                <p style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "2px" }}>{item.label}</p>
                <p style={{ fontSize: "9px", color: "#4a4f57" }}>{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 핵심 가치 */}
        <section style={{ padding: "0 24px 32px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#9ca3af", marginBottom: "14px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            왜 이지스토리 압축팩인가
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { icon: "⚡", title: "1초 압축", desc: "별도 도구 없이 버클 하나로 즉시 압축" },
              { icon: "📐", title: "공간 30% 확보", desc: "동일 캐리어 사이즈로 옷 30% 더 담김" },
              { icon: "✈️", title: "여행 필수품", desc: "기내 규격 준수 · 초경량 소재" },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "14px",
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: "12px", padding: "16px",
              }}>
                <span style={{ fontSize: "24px", flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 실제 후기 섹션 — Placeholder */}
        <section style={{ padding: "0 24px 32px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#9ca3af", marginBottom: "14px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            실구매 후기
          </h2>

          {/* Placeholder 안내 */}
          <div style={{
            background: "#1a1a1a",
            border: "1px dashed #3a3a3a",
            borderRadius: "12px", padding: "20px",
            marginBottom: "12px", textAlign: "center",
          }}>
            <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.7 }}>
              [실제 구매 후기 영역]<br />
              빈 대표 압축팩 실구매 리뷰·사진 입력 예정<br />
              <span style={{ fontSize: "11px", color: "#4a4f57" }}>
                (트랙 1 · Jae 확보 후 교체)
              </span>
            </p>
          </div>

          {/* 후기 카드 3개 — Placeholder */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{
                background: "#1a1a1a", border: "1px dashed #2a2a2a",
                borderRadius: "12px", padding: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "#2a2a2a", flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>
                      실구매자 {n}
                    </p>
                    <p style={{ fontSize: "10px", color: "#4a4f57" }}>⭐⭐⭐⭐⭐</p>
                  </div>
                </div>
                <div style={{
                  height: "48px", background: "#2a2a2a", borderRadius: "6px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <p style={{ fontSize: "10px", color: "#4a4f57" }}>
                    [실제 후기 텍스트 입력 예정]
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 하단 CTA */}
        <section style={{ padding: "0 24px 24px" }}>
          <a
            href={STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", width: "100%",
              padding: "18px",
              background: "#ef567c",
              color: "white",
              fontSize: "17px", fontWeight: 800,
              textAlign: "center", textDecoration: "none",
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(239,86,124,0.35)",
            }}
          >
            지금 구매하기 →
          </a>
          <p style={{
            fontSize: "11px", color: "#4a4f57", textAlign: "center",
            marginTop: "16px", lineHeight: 1.6,
          }}>
            ⚡ AI 생성 콘텐츠 포함 · AI기본법 제33조<br />
            이지스토리 공식 스마트스토어
          </p>
        </section>

      </div>
    </div>
  );
}
