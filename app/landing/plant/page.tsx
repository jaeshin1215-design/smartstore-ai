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
    <>
      <style>{`
        /* ── 기본 (모바일) ── */
        .pl-page {
          min-height: 100vh;
          background: #f9f9fb;
          font-family: 'Pretendard', -apple-system, sans-serif;
          color: #0d0d0e;
        }
        .pl-wrap {
          max-width: 390px;
          margin: 0 auto;
          padding: 0 0 48px;
        }
        .pl-hero {
          padding: 48px 24px 32px;
          text-align: center;
        }
        .pl-hero-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .pl-hero-text { }
        .pl-badges {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 20px;
        }
        .pl-video-box {
          width: 100%;
          aspect-ratio: 9/14;
          background: #ffffff;
          border: 1px solid #e8eaed;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 28px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .pl-cta-wrap {
          padding: 0 24px 32px;
        }
        .pl-section {
          padding: 0 24px 32px;
        }
        .pl-section-title {
          font-size: 11px;
          font-weight: 700;
          color: #9ca3af;
          margin-bottom: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .pl-trust-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .pl-value-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pl-review-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ── PC (768px+) ── */
        @media (min-width: 768px) {
          .pl-wrap {
            max-width: 1120px;
            padding: 0 48px 64px;
          }
          .pl-hero {
            padding: 64px 0 48px;
            text-align: left;
          }
          .pl-hero-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 64px;
            align-items: center;
          }
          .pl-badges {
            display: flex;
          }
          .pl-video-box {
            aspect-ratio: 9/16;
            max-height: 520px;
            margin-bottom: 0;
          }
          .pl-cta-wrap {
            padding: 0 0 40px;
          }
          .pl-section {
            padding: 0 0 40px;
          }
          .pl-trust-grid {
            gap: 16px;
          }
          .pl-value-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .pl-review-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }
      `}</style>

      <div className="pl-page">
        <div className="pl-wrap">

          {/* ── 히어로 ── */}
          <section className="pl-hero">
            <div className="pl-hero-grid">

              {/* 왼쪽: 카피 + CTA */}
              <div className="pl-hero-text">
                <div className="pl-badges">
                  <span style={{
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
                    background: "rgba(239,86,124,0.10)", border: "1px solid rgba(239,86,124,0.25)",
                    color: "#ef567c", padding: "3px 10px", borderRadius: "20px",
                  }}>
                    ⚡ AI 생성
                  </span>
                  <span style={{
                    fontSize: "10px", fontWeight: 600, color: "#6b7280",
                    background: "#ffffff", border: "1px solid #e8eaed",
                    padding: "3px 10px", borderRadius: "20px",
                  }}>
                    이지스토리 공식
                  </span>
                </div>

                <h1 style={{
                  fontSize: "clamp(32px, 5vw, 52px)",
                  fontWeight: 900, lineHeight: 1.15,
                  letterSpacing: "-0.02em", marginBottom: "16px", color: "#0d0d0e",
                }}>
                  흙 없이, 벌레 없이<br />
                  <span style={{ color: "#ef567c" }}>책상 위 작은 초록</span>
                </h1>

                <p style={{
                  fontSize: "clamp(14px, 1.8vw, 17px)",
                  color: "#64676b", lineHeight: 1.75, marginBottom: "32px",
                }}>
                  물은 2주에 한 번.<br />
                  뿌리까지 보이는 건강한 수경식물.
                </p>

                <a
                  href={STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "18px 40px",
                    background: "#ef567c", color: "white",
                    fontSize: "16px", fontWeight: 800,
                    textDecoration: "none", borderRadius: "14px",
                    boxShadow: "0 8px 32px rgba(239,86,124,0.25)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  지금 구매하기 →
                </a>
                <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "10px" }}>
                  스마트스토어 · 네이버페이 결제
                </p>
              </div>

              {/* 오른쪽: 영상 placeholder */}
              <div>
                <div className="pl-video-box">
                  <span style={{ fontSize: "32px" }}>🌿</span>
                  <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", lineHeight: 1.6, padding: "0 20px" }}>
                    [수경 릴스 들어갈 자리]<br />
                    트랙 1 영상 완성 후 삽입 예정
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* ── 신뢰 지표 ── */}
          <section className="pl-section">
            <div className="pl-trust-grid">
              {[
                { label: "구매자",   value: "—",          note: "[계약 후 실측]" },
                { label: "별점",     value: "⭐⭐⭐⭐⭐", note: "[계약 후 실측]" },
                { label: "재구매율", value: "—",          note: "[계약 후 실측]" },
              ].map((item, i) => (
                <div key={i} style={{
                  background: "#ffffff", border: "1px solid #e8eaed",
                  borderRadius: "12px", padding: "18px 12px", textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: "#0d0d0e", marginBottom: "4px" }}>
                    {item.value}
                  </p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "2px" }}>{item.label}</p>
                  <p style={{ fontSize: "9px", color: "#c4c8ce" }}>{item.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 왜 수경식물인가 ── */}
          <section className="pl-section">
            <p className="pl-section-title">왜 수경식물인가</p>
            <div className="pl-value-grid">
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
                  background: "#ffffff", border: "1px solid #e8eaed",
                  borderRadius: "12px", padding: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <span style={{ fontSize: "26px", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d0d0e", marginBottom: "6px" }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: "12px", color: "#64676b", lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 실구매 후기 ── */}
          <section className="pl-section">
            <p className="pl-section-title">실구매 후기</p>

            <div style={{
              background: "#f9fafb", border: "1px dashed #d1d5db",
              borderRadius: "12px", padding: "20px",
              marginBottom: "16px", textAlign: "center",
            }}>
              <p style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.7 }}>
                [실제 구매 후기 영역]<br />
                빈 대표 수경식물 실구매 리뷰·사진 입력 예정<br />
                <span style={{ fontSize: "11px", color: "#c4c8ce" }}>(계약 후 실값 채움)</span>
              </p>
            </div>

            <div className="pl-review-grid">
              {[1, 2, 3].map((n) => (
                <div key={n} style={{
                  background: "#ffffff", border: "1px solid #e8eaed",
                  borderRadius: "12px", padding: "18px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "50%",
                      background: "#f3f4f6", flexShrink: 0, border: "1px solid #e8eaed",
                    }} />
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#4a4f57" }}>실구매자 {n}</p>
                      <p style={{ fontSize: "10px", color: "#9ca3af" }}>⭐⭐⭐⭐⭐</p>
                    </div>
                  </div>
                  <div style={{
                    height: "52px", background: "#f9fafb", borderRadius: "6px",
                    border: "1px solid #e8eaed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <p style={{ fontSize: "10px", color: "#9ca3af" }}>[실구매 후기 텍스트 입력 예정]</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 하단 CTA ── */}
          <div className="pl-cta-wrap">
            <div style={{ maxWidth: "480px", margin: "0 auto" }}>
              <a
                href={STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", width: "100%",
                  padding: "18px",
                  background: "#ef567c", color: "white",
                  fontSize: "17px", fontWeight: 800,
                  textAlign: "center", textDecoration: "none",
                  borderRadius: "14px",
                  boxShadow: "0 8px 32px rgba(239,86,124,0.25)",
                }}
              >
                지금 구매하기 →
              </a>
              <p style={{
                fontSize: "11px", color: "#9ca3af", textAlign: "center",
                marginTop: "16px", lineHeight: 1.6,
              }}>
                ⚡ AI 생성 콘텐츠 포함 · AI기본법 제33조<br />
                이지스토리 공식 스마트스토어
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
