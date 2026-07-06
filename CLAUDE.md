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

## Tom 재개 명령 (최종 업데이트 2026-07-07)

### 완료 목록 (2026-07-06~07)
- **완료**: 이지스토리 61개 상품 전체 삭제 후 재등록 (scratch/seed_izstory_v2.mjs, 매입가=원가×EA÷1.1)
- **완료**: 원룸만들기 채널 5개 상품 판매가 수정 (공급가 칸 = 실제 판매가 특수규칙)
- **완료**: matrix_x(판매량) 재연결 + 30일 필터 로직 추가 (scratch/update_matrix_x_sales.mjs)
- **완료**: X축 라벨 "판매량(최근 30일)" → "판매량(누적)" (MatrixBox.tsx, DiagnosisTab.tsx)
- **완료**: StoreSetupTab.tsx 이상탐지 배너 price=0/null falsy 버그 수정 → "판매가 미입력" 경고
- **완료**: Discover 탭 검색량 라벨 구분 (조회 실패 / 검색량 없음) + monthlySearch "<1K" 버그 수정
- **완료**: AI 코멘트(/api/discover-advice) 추세 방향(하강/시즌종료/급상승) 프롬프트 명시 반영
- **완료**: Prophet 시즌 예측 프리뷰 — TrendTab 트렌드 상세 모달 내 52주 실데이터+12주 가상 예측선+신뢰구간 (TrendTab.tsx)
- **완료**: XGBoost 교차판매 프리뷰 — Discover 발굴현황 하단 SVG 네트워크 그래프 (DiscoverTab.tsx)
- **완료**: 판매 195건 날짜 범위 재확인 — 2026-06-26~06-30, 5일치 확정 (check_order_dates.mjs)
- **최종 커밋**: `a171c32` — sellfit.kr 배포 완료

### 다음 자리
- **#1**: PT 이후 Jae 피드백 반영
- **#2 (실제 Prophet 연동)**: Modal Python 런타임 설정 → Naver DataLab 52주 → 실제 Prophet 예측선 (별도 1일 작업)
- **#3 (실제 XGBoost)**: Sabangnet 개통 후 바스켓 500건+ 누적 → XGBoost 교차판매 모델 (Sabangnet 승인 선행 조건)
- **보류 중**: /demo ContentTab Google Flow 이미지/영상 프롬프트 탭 (Jae OK, 실행 대기)
