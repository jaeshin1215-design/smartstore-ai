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
- **완료**: Discover Matrix + ProductTimeHeatmap 전체 피니시 (커밋 831f158, 2026-07-07)
  - SVG 텍스트 통일, 채널점수 세분화(±20/±8), PATCH 라우트, 카테고리 색상, 이지스토리 사이드바
  - DataLab 연결 + Prophet fallback + X축 주단위 날짜 라벨
  - 히트맵 범례 "구매확률" → "검색 관심도" 정정
  - 실판매 보조 지표(압축팩 130, 다리미판 23, 화분 0) + 괴리 배지(화분 !)
  - 발굴현황 카드 중복 제거 (hotKeywords dedup + allGridCards 최종 dedup)
  - baseline 점 3겹 구조 (광채 링 r+6 opacity0.15 + 본체 r5/8, 불투명도 1.0)
  - main pb-16 추가 (fixed notice bar 겹침 해소)

### 2026-07-20 완료 (정산매출 확정 2건 + 권한 분리 Phase 0~3)
- **정산매출** (커밋 `513694a`): T deal 배율 0.85 확정(코드값은 원래 0.85, 주석·안내문만 정정) / 스타배송 제외 정식 규칙화
  - ⚠️ **스타배송 판정은 물류처가 아니라 상품명의 `/스타배송` 태그** (물류처는 전부 "오포물류"). 상품명 표기 바뀌면 깨짐 — 전용 열 여부 박혜미 프로 확인 예정
  - 검증: 원본 101행 → 정제 92행(제외 9), 박혜미 정제후 파일과 행수 일치
- **권한 분리 Phase 0~3** (커밋 `60958ad` → `e3bde57` → `f86b9b5`)
  - `users.role`(operator/member) + `sellfit_store_members`(다대다, owner/staff) + `sellfit_audit_log` + `stores.status`
  - 운영자는 고객 테넌트에 **소속되지 않음** → 임퍼소네이션만 (읽기전용 기본·2시간 만료·감사로그). `/api/authz/*` 4종 + `ImpersonationBar`
  - Jae 계정: 이지스토리 멤버십 제거 + `users.store_id=''`(NOT NULL 제약 때문에 NULL 대신 빈값 sentinel)
  - `/api/settlement` requireIntegrationStore 적용, 연동 라우트 readonly 우회 갭 차단, 중복 스토어 2개 archived(데이터 보존)

### 2026-07-24 완료 (정산 통합)
- **정산/매출집계 입구 단일화** (커밋 `4e402a2`, push+배포됨): ProfitSimulatorTab의 T5 자체 업로드(BLOCK 4, 6채널 한정 결함) 전면 제거 → SettlementSection(processSettlement·전체 26채널·EA 고정·고정헤더) 단일 입구. 시뮬레이터·목표마진·드롭분석·매트릭스·광고집계는 유지.
  - 근거(전량 실측): 두 파일 헤더 32개 완전 일치 / Q=EA 확정(이다슬 105/105·박혜미 25/25 원가(-VAT)·총원가 역산) / 이다슬 195건 재대조 AA·AB 불일치 0(1원 불변)
  - ⚠️ 미결(별건): CHANNEL_RULES 미등록 채널 3(쿠팡·신세계몰(신)·홈&쇼핑(신)) — 공급가 N 빈 행 대비 규칙 추가 검토
  - 사방넷 CS API 프로브 5회 결론: `/v3/sb/cs`의 `answerContent`는 고객응대 답변이라 심유나 재출고 지시(★…검수) 아님 → 교환 발주서는 엑셀 업로드로 확정(별건 대기)

### 다음 자리
- **#0 (Phase 4, 권한분리 잔여)**: `users.store_id` 컬럼 제거 + 빈값 sentinel 소멸. **반드시 같이 처리**: `auth/demo-request`가 `store_members`를 안 만듦(현재는 store_id 폴백으로 동작) / 기능 플래그화(env INTEGRATION_STORE_ID → 스토어별)는 **2호 계약 시점**
- **#1 (D-60 활성화)**: POST /api/db/migrate-discover-v1 실행 → 테이블 생성 → POST /api/cron/discover-engine 수동 테스트
- **#2 (Prophet 실제 연동)**: modal.com 계정 생성 → `modal deploy scripts/prophet_app.py` → MODAL_PROPHET_URL 환경변수 등록
- **#3 (실제 XGBoost)**: Sabangnet 개통 후 바스켓 500건+ 누적 → XGBoost 모델 (Sabangnet 승인 선행)
- **보류 중**: /demo ContentTab Google Flow 이미지/영상 프롬프트 탭 (Jae OK, 실행 대기)
