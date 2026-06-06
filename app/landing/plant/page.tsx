import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이지스토리 수경식물 — 흙 없이, 벌레 없이",
  description: "물은 2주에 한 번. 뿌리까지 보이는 건강한 수경식물.",
};

const STORE_BASE = "https://smartstore.naver.com/YOUR_STORE_LINK";

export default function PlantLandingPage({
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
      <div style={{ maxWidth: "390px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* 히어로 */}
        <section style={{ padding: "48px 24px 32px", textAlign: "center" }}>

          {/* 배지 */}
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

          {/* 메인 카피 */}
          <h1 style={{
            fontSize: "36px", fontWeight: 900, lineHeight: 1.2,
            letterSpacing: "-0.02em", marginBottom: "12px",
          }}>
            흙 없이, 벌레 없이<br />
            <span style={{ color: "#ef567c" }}>책상 위 작은 초록</span>
          </h1>

          <p style={{
            fontSize: "15px", color: "#9ca3af", lineHeight: 1.7, marginBottom: "28px",
          }}>
            물은 2주에 한 번.<br />
            뿌리까지 보이는 건강한 수경식물.
          </p>

          {/* 영상 placeholder */}
          <div style={{
            width: "100%", aspectRatio: "9/10",
            background: "#1a1a1a",
            border: "1px dashed #2a2a2a",
            borderRadius: "16px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "8px", marginBottom: "28px",
          }}>
            <span style={{ fontSize: "32px" }}>🌿</span>
            <p style={{ fontSize: "11px", color: "#4a4f57", textAlign: "center", lineHeight: 1.6 }}>
              [수경 릴스 들어갈 자리]<br />
              트랙 1 영상 완성 후 삽입 예정
            </p>
          </div>

          {/* CTA */}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {[
              { label: "구매자", value: "—", note: "[계약 후 실측]" },
              { label: "별점",   value: "⭐⭐⭐⭐⭐", note: "[계약 후 실측]" },
              { label: "재구매율", value: "—", note: "[계약 후 실측]" },
            ].map((item, i) => (
              <div key={i} style={{
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: "12px", padding: "14px 10px", textAlign: "center",
              }}>
                <p style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                  {item.value}
                </p>
                <p style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "2px" }}>{item.label}</p>
                <p style={{ fontSize: "9px", color: "#4a4f57" }}>{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 왜 수경식물인가 */}
        <section style={{ padding: "0 24px 32px" }}>
          <h2 style={{
            fontSize: "14px", fontWeight: 700, color: "#9ca3af",
            marginBottom: "14px", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            왜 수경식물인가
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              {
                icon: "🌿",
                title: "흙 없음",
                desc: "벌레 걱정 없는 깨끗한 실내 식물. 흙이 없어 화분 관리 부담 없음.",
              },
              {
                icon: "💧",
                title: "물 2주에 한 번",
                desc: "바쁜 사람도 안 죽이는 관리. 자주 챙기지 않아도 건강하게 자람.",
              },
              {
                icon: "🔍",
                title: "뿌리까지 보임",
                desc: "유리병 속 건강한 뿌리. 식물이 살아있다는 걸 눈으로 확인.",
              },
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

        {/* 실구매 후기 placeholder */}
        <section style={{ padding: "0 24px 32px" }}>
          <h2 style={{
            fontSize: "14px", fontWeight: 700, color: "#9ca3af",
            marginBottom: "14px", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            실구매 후기
          </h2>

          <div style={{
            background: "#1a1a1a", border: "1px dashed #3a3a3a",
            borderRadius: "12px", padding: "20px",
            marginBottom: "12px", textAlign: "center",
          }}>
            <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.7 }}>
              [실제 구매 후기 영역]<br />
              빈 대표 수경식물 실구매 리뷰·사진 입력 예정<br />
              <span style={{ fontSize: "11px", color: "#4a4f57" }}>
                (계약 후 실값 채움)
              </span>
            </p>
          </div>

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
                    [실구매 후기 텍스트 입력 예정]
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
