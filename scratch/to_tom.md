# ✉️ Tom 작업 인수인계 — SellFit + 파이프라인 세션 (2026-06-04~05)

* **세션 주체**: Jae 대표님
* **수행 에이전트**: Tom (Claude Code)
* **대상 프로젝트**: `smartstore-ai` (SellFit)

---

## ✅ 오늘 완료된 작업

### 1. BiddingTab — SearchAd 실측 배선 연결 (①②)
- CPC 먼저 조회(await) → AI 프롬프트에 실측값 주입 (`cpcData: realCpcData`)
- `/api/bidding/route.ts` 프롬프트에 실측 CPC 섹션 추가
- 카드 주인공 숫자: `↓N원 여기까지 내려도 노출 유지` 포맷
- 배지: `cpcData` 있으면 "실측 참고", 없으면 "AI 추정값"
- JSON 중복 파싱 버그 수정 (greedy 정규식 → 첫 번째 완전한 JSON 추출)

### 2. BiddingTab + PricingTab — 색 원칙 적용 (③)
- `#0f2a1e` (다크 그린) → `#1a1a1a` (블랙) 전체 교체
- `#007a4d`, `#00aa6c` → 블랙/그레이/핑크로 교체
- 스켈레톤 그린 → 그레이

### 3. SeoTab — Frill 색상 정리 (④)
- `#1a1a2e` → `#1a1a1a`

### 4. DiagnosisTab — 오퍼 설계 섹션 추가
- Drawer 4번째 칸 "📣 오퍼 설계" 신설 (결정 섹션 바로 아래)
- `/api/offer/route.ts` 생성 — 5개 항목 AI 초안 (꿈의결과·가능성·시간지연·노력희생·후킹)
- 모든 필드 수정 가능한 textarea
- `needs_evidence` 플래그 → "⚠️ 실증자료 필요" 표시
- PolicyFilter 연결 — 과장 표현 실시간 경고
- "AI 생성 초안 · AI기본법 제33조" 표기

### 5. naverPolicyConfig.ts — KC·실증 규칙 확장
- 하중·강도 수치 표현, KC인증 (번호 없는 경우), N배 비교, 평생보증, 임상 표현 등 9개 규칙 추가

### 6. MVP 파이프라인 뼈대 구축
- `/app/api/reel/upload/route.ts` — Instagram Reels 자동 업로드 (Meta Graph API)
- `/app/api/reel/insights/route.ts` — 타깃 반응 지표 조회
- `/app/pipeline/page.tsx` — 대시보드 (`localhost:3000/pipeline`)
- `scratch/pipeline/convert.mjs` — FFmpeg 변환 스크립트 (9:16·"AI 생성" 라벨)

---

## 🔵 다음 세션 — 파이프라인 n8n 전환

**핵심 결정**: 파이프라인 = n8n 워크플로우.
Tom이 n8n 워크플로우 JSON 파일 생성 → Jae가 n8n에서 Import → 완료.
(이전 n8n 셋업 때 동일 방식으로 시간 대폭 단축된 경험 있음)

**다음 작업:**
1. n8n 설치 상태 확인 (로컬 vs cloud.n8n.io) — Jae 확인 필요
2. Flow 영상(mp4) 수신 대기 중 — Jae가 Google Flow 세팅 확인 후 전달 예정
3. n8n 워크플로우 JSON 생성:
   - FFmpeg 변환 노드 (Flow mp4 → 9:16·AI 라벨)
   - Instagram Reels 업로드 노드
   - Insights 조회 노드
   - 결과 대시보드 연동

**중요 원칙 (메모리 저장됨):**
- 파이프라인 셋업 = Tom이 파일/JSON 만들고 Jae는 Import만
- 단계별 수동 체크리스트 주지 말 것

---

## 📁 수정/생성된 파일 목록

```
app/api/bidding/route.ts          — 실측 CPC 주입
app/api/offer/route.ts            — 오퍼 설계 AI 생성
app/api/reel/upload/route.ts      — Instagram Reels 업로드
app/api/reel/insights/route.ts    — 인사이트 조회
app/pipeline/page.tsx             — 파이프라인 대시보드
components/BiddingTab.tsx         — ↓N원 포맷 · 색 원칙 · 파싱 수정
components/PricingTab.tsx         — 색 원칙 (그린 제거)
components/SeoTab.tsx             — 색 정리
components/DiagnosisTab.tsx       — 오퍼 설계 섹션 추가
lib/naverPolicyConfig.ts          — KC·실증 규칙 확장
scratch/pipeline/convert.mjs     — FFmpeg 변환 스크립트
```
