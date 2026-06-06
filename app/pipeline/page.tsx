"use client";

import { useState } from "react";

interface Insights {
  reach?: number;
  plays?: number;
  avg_watch_sec?: number;
  saved?: number;
  shares?: number;
  comments?: number;
  likes?: number;
  total_interactions?: number;
}

const CARD: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e8eaed",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", fontSize: "13px", borderRadius: "8px",
  padding: "10px 14px", outline: "none",
  background: "#f9fafb", border: "1px solid #e8eaed",
  color: "#1a1a1a", fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.06em",
  color: "#9ca3af", marginBottom: "5px",
};

export default function PipelinePage() {
  // Upload state
  const [videoUrl, setVideoUrl]   = useState("");
  const [caption, setCaption]     = useState("");
  const [uploading, setUploading] = useState(false);
  const [mediaId, setMediaId]     = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  // Insights state
  const [insightId, setInsightId]   = useState("");
  const [fetching, setFetching]     = useState(false);
  const [insights, setInsights]     = useState<Insights | null>(null);
  const [insightErr, setInsightErr] = useState("");

  const handleUpload = async () => {
    if (!videoUrl || uploading) return;
    setUploading(true); setUploadMsg(""); setMediaId("");
    try {
      const res = await fetch("/api/reel/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, caption }),
      });
      const data = await res.json();
      if (data.error) { setUploadMsg("❌ " + data.error); return; }
      setMediaId(data.mediaId);
      setInsightId(data.mediaId);
      setUploadMsg("✅ 게시 완료 — Media ID: " + data.mediaId);
    } catch { setUploadMsg("❌ 업로드 오류"); }
    finally { setUploading(false); }
  };

  const handleInsights = async () => {
    if (!insightId || fetching) return;
    setFetching(true); setInsights(null); setInsightErr("");
    try {
      const res = await fetch(`/api/reel/insights?mediaId=${insightId}`);
      const data = await res.json();
      if (data.error) { setInsightErr(data.error); return; }
      setInsights(data);
    } catch { setInsightErr("인사이트 조회 오류"); }
    finally { setFetching(false); }
  };

  const MetricBox = ({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) => (
    <div style={{ padding: "14px 16px", background: highlight ? "#fff5f8" : "#f9fafb", border: `1px solid ${highlight ? "#ffd6e0" : "#e8eaed"}`, borderRadius: "8px", textAlign: "center" }}>
      <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</p>
      <p style={{ fontSize: "22px", fontWeight: 800, color: highlight ? "#ef567c" : "#1a1a1a" }}>{value}</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9fb", fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      {/* 헤더 */}
      <div style={{ background: "white", borderBottom: "1px solid #e8eaed", padding: "0 32px" }}>
        <div style={{ height: "48px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a" }}>SellFit</span>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>›</span>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#ef567c" }}>AI 릴스 파이프라인</span>
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "9px", background: "#fff5f5", color: "#ef567c" }}>BETA</span>
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* 안내 배너 */}
        <div style={{ ...CARD, background: "#fafafa", borderLeft: "3px solid #ef567c", padding: "14px 18px" }}>
          <p style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>MVP 파이프라인 — Dev Mode (이지스토리 테스터 계정)</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>
            Flow 영상 → 인스타 릴스 자동 배포 → 타깃 반응 측정
          </p>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
            ⚠️ 영상은 공개 URL이어야 합니다 (Instagram 서버가 직접 접근). localhost URL 불가.
          </p>
        </div>

        {/* Step 1: 업로드 */}
        <div style={CARD}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "4px" }}>① 릴스 배포</p>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", marginBottom: "2px" }}>Flow 영상 → 인스타그램 업로드</h2>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "16px" }}>
            Flow에서 내보낸 mp4를 공개 URL로 호스팅 후 붙여넣기
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>영상 URL <span style={{ color: "#ef567c", textTransform: "none" }}>*</span></label>
              <input
                type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://your-storage.com/reel.mp4"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>캡션 (해시태그 포함)</label>
              <textarea
                rows={3} value={caption} onChange={e => setCaption(e.target.value)}
                placeholder={"압축팩 하나로 캐리어 공간 30% 확보 ✈️\n#여행준비 #압축팩 #스마트패킹\n⚡ AI 생성 광고"}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !videoUrl}
              style={{
                padding: "13px", borderRadius: "8px", border: "none", fontFamily: "inherit",
                background: uploading || !videoUrl ? "#f0f1f3" : "#ef567c",
                color: uploading || !videoUrl ? "#9ca3af" : "white",
                fontSize: "14px", fontWeight: 700, cursor: uploading || !videoUrl ? "not-allowed" : "pointer",
              }}
            >
              {uploading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <span style={{ width: "14px", height: "14px", border: "2px solid #9ca3af", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                    업로드 중... (최대 60초)
                  </span>
                : "📲 인스타그램 릴스 게시"}
            </button>
            {uploadMsg && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: uploadMsg.startsWith("✅") ? "#f0fdf4" : "#fff1f0", border: `1px solid ${uploadMsg.startsWith("✅") ? "#bbf7d0" : "#fca5a5"}` }}>
                <p style={{ fontSize: "13px", color: uploadMsg.startsWith("✅") ? "#15803d" : "#dc2626", fontWeight: 600 }}>{uploadMsg}</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: 인사이트 */}
        <div style={CARD}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "4px" }}>② 타깃 반응 측정</p>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", marginBottom: "2px" }}>인스타그램 인사이트</h2>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "16px" }}>
            게시 후 24~48시간 후 측정 가능. saved(저장) = 구매 의도 핵심 신호.
          </p>

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text" value={insightId} onChange={e => setInsightId(e.target.value)}
              placeholder="Media ID (업로드 후 자동 입력됨)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handleInsights}
              disabled={fetching || !insightId}
              style={{
                padding: "10px 16px", borderRadius: "8px", border: "none", fontFamily: "inherit",
                background: fetching || !insightId ? "#f0f1f3" : "#1a1a1a",
                color: fetching || !insightId ? "#9ca3af" : "white",
                fontSize: "13px", fontWeight: 600, cursor: fetching || !insightId ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {fetching ? "조회 중..." : "반응 불러오기"}
            </button>
          </div>

          {insightErr && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#fff1f0", border: "1px solid #fca5a5", marginBottom: "12px" }}>
              <p style={{ fontSize: "12px", color: "#dc2626" }}>{insightErr}</p>
            </div>
          )}

          {insights && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* 핵심 지표 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                <MetricBox label="저장 (구매의도)" value={insights.saved ?? 0} highlight />
                <MetricBox label="도달" value={(insights.reach ?? 0).toLocaleString()} />
                <MetricBox label="재생" value={(insights.plays ?? 0).toLocaleString()} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                <MetricBox label="평균 시청(초)" value={insights.avg_watch_sec ?? 0} />
                <MetricBox label="공유" value={insights.shares ?? 0} />
                <MetricBox label="댓글" value={insights.comments ?? 0} />
                <MetricBox label="좋아요" value={insights.likes ?? 0} />
              </div>
              <div style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e8eaed" }}>
                <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                  전체 인게이지먼트: <strong style={{ color: "#1a1a1a" }}>{(insights.total_interactions ?? 0).toLocaleString()}</strong>
                  {insights.saved && insights.reach
                    ? <> · 저장률: <strong style={{ color: "#ef567c" }}>{((insights.saved / insights.reach) * 100).toFixed(1)}%</strong></>
                    : null}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* n8n 임포트 안내 */}
        <div style={{ ...CARD, background: "#fafafa" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "12px" }}>n8n 파이프라인 설정</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Step 1 — Meta App */}
            <div style={{ padding: "14px 16px", background: "white", border: "1px solid #e8eaed", borderRadius: "8px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>
                ① Meta App 생성 <span style={{ fontWeight: 400, color: "#9ca3af" }}>(1회만, 5분)</span>
              </p>
              <p style={{ fontSize: "12px", color: "#4a4f57", lineHeight: 1.7 }}>
                1. <strong>developers.facebook.com</strong> → 새 앱 생성 (Business 유형)<br />
                2. Instagram 제품 추가 → 이지스토리 계정을 <strong>App Tester</strong>로 등록<br />
                3. Graph API Explorer에서 User Access Token 발급<br />
                &nbsp;&nbsp;&nbsp;권한 체크: <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: "3px", fontSize: "11px" }}>instagram_basic, instagram_content_publish</code><br />
                4. <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: "3px", fontSize: "11px" }}>GET /me?fields=id</code> 로 User ID 확인
              </p>
            </div>

            {/* Step 2 — n8n 임포트 */}
            <div style={{ padding: "14px 16px", background: "white", border: "1px solid #e8eaed", borderRadius: "8px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>
                ② n8n.cloud 워크플로우 임포트
              </p>
              <p style={{ fontSize: "12px", color: "#4a4f57", lineHeight: 1.7 }}>
                n8n.cloud → Workflows → <strong>Import from File</strong> → 아래 두 파일 임포트<br />
                <br />
                <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "3px", fontSize: "11px" }}>scratch/pipeline/n8n_reels_upload.json</code>
                <span style={{ color: "#9ca3af", fontSize: "11px" }}> — 업로드 파이프라인</span><br />
                <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "3px", fontSize: "11px" }}>scratch/pipeline/n8n_reels_insights.json</code>
                <span style={{ color: "#9ca3af", fontSize: "11px" }}> — 인사이트 조회</span><br />
                <br />
                임포트 후 <strong>Set: 설정</strong> 노드에서 2가지만 수정:<br />
                <code style={{ background: "#fff5f8", color: "#ef567c", padding: "1px 5px", borderRadius: "3px", fontSize: "11px" }}>accessToken</code>
                <code style={{ background: "#fff5f8", color: "#ef567c", padding: "1px 5px", borderRadius: "3px", fontSize: "11px", marginLeft: "6px" }}>userId</code>
              </p>
            </div>

            {/* Step 3 — 실행 */}
            <div style={{ padding: "14px 16px", background: "white", border: "1px solid #e8eaed", borderRadius: "8px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>
                ③ 영상 올리기
              </p>
              <p style={{ fontSize: "12px", color: "#4a4f57", lineHeight: 1.7 }}>
                Flow에서 내보낸 mp4 → <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: "3px", fontSize: "11px" }}>node scratch/pipeline/convert.mjs input.mp4 reel.mp4</code> 로 9:16 변환<br />
                변환된 파일을 공개 URL에 업로드 (S3·Cloudflare R2 등)<br />
                n8n <strong>Set: 설정</strong> → <code style={{ background: "#fff5f8", color: "#ef567c", padding: "1px 5px", borderRadius: "3px", fontSize: "11px" }}>videoUrl</code> 붙여넣기 → Execute
              </p>
              <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>
                ⚠️ Instagram 서버가 직접 다운로드해야 해서 공개 접근 가능한 URL 필수 (localhost 불가)
              </p>
            </div>

          </div>
        </div>

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
