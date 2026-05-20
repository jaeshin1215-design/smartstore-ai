const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/api/naver-trend/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

const start = content.indexOf('        // Step 3: AI');
const markerEnd = '        controller.enqueue(send({ type: "ai", aiAnalysis }));\n\n      } catch {';
const endIdx = content.indexOf(markerEnd);
const end = endIdx + '        controller.enqueue(send({ type: "ai", aiAnalysis }));'.length;

if (start === -1 || endIdx === -1) {
  console.error('Block not found. start:', start, 'endIdx:', endIdx);
  process.exit(1);
}

const newBlock = `        // Step 3: AI 분석 — Gemini 스트리밍으로 토큰 실시간 수신 (Phase 2)
        const recent7 = trend.ratios.slice(-7);
        const prev7   = trend.ratios.slice(-14, -7);
        const recentAvg = recent7.reduce((s, r) => s + r, 0) / (recent7.length || 1);
        const prevAvg   = prev7.reduce((s, r) => s + r, 0)   / (prev7.length   || 1);
        const growthRate = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0;

        const aiPrompt = \`스마트스토어 셀러 관점에서 키워드 트렌드를 분석하고 판단해주세요.
키워드:"\${keyword}" 검색지수:\${recentAvg.toFixed(1)} 증감:\${growthRate > 0 ? "+" : ""}\${growthRate}% 성별:남\${gender.male_pct}%/여\${gender.female_pct}% 연령:\${Object.entries(age).map(([k,v])=>\`\${k} \${v}%\`).join("/")} 급상승연관:\${related.slice(0,3).map(r=>\`\${r.keyword}(\${r.growth>0?"+":""}\${r.growth}%)\`).join(",")}
JSON만 응답: {"verdict":"good 또는 bad 또는 neutral","action_command":"지금 [액션] — 이유 한 문장","reason":"수치 근거 2문장","tips":["오늘 할 것","이번 주 할 것","타겟 공략 팁"]}\`;

        let rawAi = "";
        try {
          const aiGeminiStream = createGeminiStream(aiPrompt, 300);
          const aiReader = aiGeminiStream.getReader();
          const aiDec = new TextDecoder();
          while (true) {
            const { done, value } = await aiReader.read();
            if (done) break;
            rawAi += aiDec.decode(value, { stream: true });
            controller.enqueue(send({ type: "ai_stream" }));
          }
        } catch { /* keep default */ }

        let aiAnalysis = {
          verdict: "neutral" as "good" | "bad" | "neutral",
          action_command: "검색 데이터를 수집했습니다. 아래 데이터를 참고하세요.",
          reason: "검색량 데이터를 기반으로 판단하세요.",
          tips: ["상품 등록 최적화", "키워드 활용 강화", "타겟 고객층 분석"],
        };
        try {
          aiAnalysis = JSON.parse(rawAi.replace(/\`\`\`json\\n?/g, "").replace(/\`\`\`\\n?/g, "").trim());
        } catch { /* keep default */ }

        // ── Phase 2: AI 결과 전송 ──
        controller.enqueue(send({ type: "ai", aiAnalysis }));`;

const newContent = content.slice(0, start) + newBlock + content.slice(end);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Done. start:', start, 'end:', end, 'new length:', newContent.length);
