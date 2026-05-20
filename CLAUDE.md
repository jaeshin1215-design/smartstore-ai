# smartstore-ai — Claude Code 프로젝트 문서

## 프로젝트 개요
- **앱명**: 스마트스토어 AI 도우미
- **목적**: 네이버 스마트스토어 셀러를 위한 AI 자동화 도구
- **스택**: Next.js 16.2.3 (App Router, TypeScript), Vercel 배포
- **AI**: OpenRouter API → `anthropic/claude-3-haiku`
- **사업자**: 제이앤드에이 (J&A) — 대표 Jae
- **배포 URL**: https://smartstore-ai-xi.vercel.app/

## 13개 탭 목록
| 탭 ID | 탭 이름 | API 경로 |
|-------|---------|---------|
| content | 🚀 All in One | /api/content + /api/imageplan |
| trend | 📊 트렌드 리포트 | /api/trend |
| seo | 📈 상품명 SEO | /api/seo |
| story | 🛒 구매 전환율 | /api/story |
| thumbdiff | 🎨 썸네일 차별화 | /api/thumbdiff |
| upsell | 📦 업셀링 전략 | /api/upsell |
| adcopy | 📣 광고 전략 | /api/adcopy |
| bidding | 💡 키워드 입찰 | /api/bidding |
| discount | 🎁 할인 & 가치 | /api/discount |
| customer | 💬 고객 소통 | /api/reply |
| tags | 🏷️ 태그 생성 | /api/tags |
| imageedit | ✏️ 이미지 편집 | /api/description |
| pricing | 💰 가격 책정 | /api/pricing |

## API 필수 규칙
```typescript
model: "anthropic/claude-3-haiku",
max_tokens: 2000,  // 절대 생략 금지 — JSON 잘림 방지
```

### 에러 응답
```typescript
return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
// raw 데이터 포함 금지
```

### 병렬 호출
- Promise.all 금지 → Promise.allSettled 사용

## 금지 사항
- max_tokens 생략 금지
- Promise.all 병렬 호출 금지
- Stripe 추천 금지 (한국 미지원)
- Google Calendar 버튼을 셀러 UI에 추가 금지

## 결제 시스템
- Toss Payments (빌링/정기결제) — 월요일 1544-7772 문의 필요

## 예정 기능
1. 네이버 정책 위반 필터 (lib/naverPolicyFilter.ts)
2. Toss Payments 연동
3. 무료/유료 플랜 구분
4. 랜딩페이지 제작
