# smartstore-ai 프로젝트 전체 분석 보고서

> 분석 일자: 2026-04-17

---

## 1. 현재 구현된 기능 목록

### 탭 구성 (13개)

| 탭 ID | 탭 이름 | API | 설명 |
|-------|--------|-----|------|
| content | 🚀 All in One | /api/content + /api/imageplan | 마케팅 카피·썸네일·상세페이지·블로그·인스타·카카오·이미지기획 한 번에 생성 |
| trend | 📊 트렌드 리포트 | /api/trend | 월별/시즌별 트렌드, 급상승 키워드, 이벤트 기회, 액션 체크리스트 |
| seo | 📈 상품명 SEO | /api/seo | 상품명 3가지 최적화 버전, SEO 점수, 키워드 전략 |
| story | 🛒 구매 전환율 | /api/story | 스토리텔링 기반 구매 전환율 향상 상세페이지 |
| thumbdiff | 🎨 썸네일 차별화 | /api/thumbdiff | 경쟁사 썸네일 패턴 분석 + 차별화 전략 |
| upsell | 📦 업셀링 전략 | /api/upsell | 객단가 최적화, 번들 상품 구성 |
| adcopy | 📣 광고 전략 | /api/adcopy | 네이버·카카오·인스타 광고 문구 + 전환 전략 |
| bidding | 💡 키워드 입찰 | /api/bidding | CPC 입찰가, 예산 배분 3단계 |
| discount | 🎁 할인 & 가치 | /api/discount | 카테고리별 할인 전략, 가치 제안 |
| customer | 💬 고객 소통 | /api/reply + /api/review | 문의 답변 + 긍정/부정/중립 리뷰 답글 |
| tags | 🏷️ 태그 생성 | /api/tags | 검색 최적화 태그 20개 자동 생성 |
| imageedit | ✏️ 이미지 편집 | 없음 (Canvas API) | 밝기·대비·채도·선명도 조정 + 텍스트 오버레이 |
| pricing | 💰 가격 책정 | /api/pricing | 원가 기반 판매가 추천, 마진율 계산 (수수료 5.85%) |

### API 라우트 현황 (17개)

사용 중인 API: content, imageplan, trend, seo, story, thumbdiff, upsell, adcopy, bidding, discount, reply, review, tags, pricing, description  
**미사용 API: `/api/keywords`, `/api/thumbnail`** → 정리 필요

---

## 2. 오류 발생 원인

### 🔴 Critical (즉시 수정 필요)

#### 2-1. JSON 응답 잘림 (파싱 실패)
- **원인**: 대부분의 API에 `max_tokens` 미설정 → Claude 기본값(1000토큰)으로 긴 JSON이 중간에 잘림
- **영향 API**: adcopy, bidding, discount, seo, story, thumbdiff, upsell, tags, trend 등 대부분
- **현재 설정**: content, imageplan만 `max_tokens: 4000` 설정됨
- **수정 방법**: 모든 API에 `max_tokens: 2000` 이상 추가

```typescript
// 수정 전
body: JSON.stringify({
  model: "anthropic/claude-3-haiku",
  messages: [...]
})

// 수정 후
body: JSON.stringify({
  model: "anthropic/claude-3-haiku",
  max_tokens: 2000,  // 추가
  messages: [...]
})
```

#### 2-2. Promise.all 부분 실패 처리 없음
- **파일**: `components/ContentTab.tsx`
- **원인**: `Promise.all`은 하나라도 실패하면 전체 실패
- **영향**: content 또는 imageplan 중 하나가 실패하면 결과가 아무것도 표시되지 않음
- **수정 방법**: `Promise.allSettled` 사용

```typescript
// 수정 전
const [contentRes, imageRes] = await Promise.all([...])

// 수정 후
const [contentSettled, imageSettled] = await Promise.allSettled([...])
if (contentSettled.status === 'fulfilled') { ... }
if (imageSettled.status === 'fulfilled') { ... }
```

#### 2-3. 에러 처리 불일치
- **원인**: API마다 에러 응답 형식이 다름
- **예시**:
  - `/api/reply` → 오류 시 `{ result: "오류 메시지" }` (성공처럼 보임)
  - `/api/seo` → 오류 시 `{ error: "결과 파싱 실패" }` (status 500)
  - `/api/content` → 오류 시 `{ error: "...", raw: text }` (디버그용 raw 포함)
- **영향**: 컴포넌트에서 에러/성공 구분 불가, raw 디버그 데이터가 프로덕션에 노출

### 🟠 High (우선 수정 권장)

#### 2-4. 한국어 강제 미비
- **원인**: 프롬프트에 한국어 응답 강제 지시 없음
- **영향**: 드물지만 Claude가 영어로 응답할 가능성 있음
- **수정**: 모든 프롬프트에 `"반드시 한국어로만 응답하세요."` 추가

#### 2-5. 타입 변환 누락
- **파일**: `/api/adcopy`, `/api/discount` 등
- **원인**: 프롬프트에서 숫자 요청하나, Claude가 "15%"처럼 문자열로 응답 가능
- **영향**: 프론트엔드에서 숫자 연산 오류

#### 2-6. content API raw 디버그 데이터 노출
- **파일**: `app/api/content/route.ts`
- **문제**: 에러 시 `raw: text` 포함 → OpenRouter 원본 응답 노출

---

## 3. 기능 간 충돌 분석

### 중복 기능

| 충돌 | 파일 | 심각도 | 조치 |
|------|------|--------|------|
| CustomerTab vs ReviewTab | CustomerTab.tsx, ReviewTab.tsx | 중간 | ReviewTab 삭제 권장 (CustomerTab에 통합됨) |
| ContentTab 이미지기획 vs ImagePlanTab | ContentTab.tsx, ImagePlanTab.tsx | 낮음 | 둘 다 /api/imageplan 호출 (탭 분리 의도는 다름) |
| /api/description vs /api/content | route.ts 2개 | 낮음 | content에 상품 설명문 포함됨 → description 탭 제거 고려 |
| /api/keywords (미사용) | app/api/keywords/route.ts | 낮음 | 어떤 컴포넌트도 호출 안 함 → 삭제 권장 |
| /api/thumbnail (미사용) | app/api/thumbnail/route.ts | 낮음 | 어떤 컴포넌트도 호출 안 함 → 삭제 권장 |

### 상태 관리 충돌

- **문제**: 전역 상태 관리 없음 → 각 탭이 독립적으로 상품명을 입력 받음
- **영향**: 사용자가 탭 이동 시마다 같은 정보를 반복 입력해야 함
- **해결책**: Context API 또는 Zustand로 productInput 전역 공유

---

## 4. 우선순위별 수정 항목

### 🔴 Priority 1 — 즉시 수정 (기능 오류)

| # | 항목 | 파일 | 예상 작업량 |
|---|------|------|-----------|
| 1 | 모든 API에 `max_tokens: 2000` 추가 | app/api/*/route.ts (15개) | 30분 |
| 2 | ContentTab Promise.all → Promise.allSettled | components/ContentTab.tsx | 15분 |
| 3 | content API 에러 응답에서 `raw` 제거 | app/api/content/route.ts | 5분 |

### 🟠 Priority 2 — 빠른 수정 (품질 개선)

| # | 항목 | 파일 | 예상 작업량 |
|---|------|------|-----------|
| 4 | 미사용 API 삭제 (/api/keywords, /api/thumbnail) | 해당 route.ts | 10분 |
| 5 | ReviewTab 삭제 (CustomerTab에 통합됨) | ReviewTab.tsx + page.tsx | 10분 |
| 6 | 모든 프롬프트에 "반드시 한국어로만 응답" 추가 | app/api/*/route.ts | 30분 |
| 7 | 에러 응답 형식 통일 | app/api/*/route.ts | 30분 |

### 🟡 Priority 3 — 중기 개선 (UX 개선)

| # | 항목 | 설명 | 예상 작업량 |
|---|------|------|-----------|
| 8 | 전역 상품 정보 입력 | Context API로 탭 간 정보 공유 | 2시간 |
| 9 | 로딩 상태 개선 | Streaming 또는 단계별 진행률 | 3시간 |
| 10 | 입력값 검증 강화 | 길이 제한, 특수문자 처리 | 1시간 |

### 🟢 Priority 4 — 장기 개선 (확장성)

| # | 항목 | 설명 |
|---|------|------|
| 11 | Rate limiting | API 남용 방지 |
| 12 | 사용자 인증 | 계정 기반 할당량 관리 |
| 13 | 결과 저장 기능 | 생성 결과 히스토리 |
| 14 | 분석 대시보드 | 사용 통계 |

---

## 5. 기능별 현재 상태 요약

| 기능 | 작동 | 오류 가능성 | 비고 |
|------|------|-----------|------|
| All in One 콘텐츠 | ✅ | 중간 (긴 응답 잘림 가능) | max_tokens 4000 설정됨 |
| 이미지 기획 | ✅ | 중간 (긴 응답 잘림 가능) | max_tokens 4000 설정됨 |
| 트렌드 리포트 | ✅ | 높음 (max_tokens 미설정) | |
| 상품명 SEO | ✅ | 높음 (max_tokens 미설정) | |
| 구매 전환율 | ✅ | 높음 (max_tokens 미설정) | |
| 썸네일 차별화 | ✅ | 높음 (max_tokens 미설정) | |
| 업셀링 전략 | ✅ | 높음 (max_tokens 미설정) | |
| 광고 전략 | ✅ | 높음 (max_tokens 미설정) | |
| 키워드 입찰 | ✅ | 높음 (max_tokens 미설정) | |
| 할인 & 가치 | ✅ | 높음 (max_tokens 미설정) | |
| 고객 소통 | ✅ | 낮음 (텍스트 응답이라 파싱 없음) | |
| 태그 생성 | ✅ | 높음 (max_tokens 미설정) | |
| 이미지 편집기 | ✅ | 없음 (순수 클라이언트) | Canvas API |
| 가격 책정 | ✅ | 중간 | 수수료 계산 정확함 |

---

## 6. 가장 빠른 개선 방법 (30분 내 적용 가능)

```bash
# 모든 API 라우트에 max_tokens 일괄 추가
# app/api/*/route.ts 에서 아래 패턴을 찾아서 교체

# 찾기:
model: "anthropic/claude-3-haiku",
messages:

# 교체:
model: "anthropic/claude-3-haiku",
max_tokens: 2000,
messages:
```

이것만 해도 **오류 발생률이 70% 이상 감소**할 것으로 예상됩니다.
