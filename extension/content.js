// SellFit Price Guard — content script
// 사람이 연(또는 확장이 백그라운드로 연) 쿠팡 페이지에서 소비자 최종 결제가만 추출한다.
// 검증 4케이스: (a) JSON-LD offers.price  (b) 상품ID /vp/products/{n} 기준
//              (c) 할인율·취소선 정가 무시, 최종가만  (d) 순위 무관 ID 추적
//              (e) 광고 카드 제외 + 카드 경계 준수

(() => {
  // 백그라운드 비활성 탭은 렌더·지연로드가 느림 — 최대 22.5초(15×1.5s) 폴링 대기
  const MAX_RETRY = 15;
  const RETRY_MS = 1500;
  console.log("[PG content] 주입됨:", location.href);

  function parsePrice(text) {
    const n = Number(String(text ?? "").replace(/[^\d]/g, ""));
    return n > 0 ? n : null;
  }

  // ── (a) 상품페이지: JSON-LD offers.price가 1순위 (Jae 실측 5회 검증: 10,900 정확) ──
  function extractProductPage() {
    const m = location.pathname.match(/\/vp\/products\/(\d+)/);
    if (!m) return null;
    const productId = m[1];

    let price = null;
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(s.textContent);
        for (const node of Array.isArray(data) ? data : [data]) {
          const offers = node && node.offers;
          if (!offers) continue;
          const p = parsePrice(Array.isArray(offers) ? offers[0]?.price : offers.price);
          if (p) { price = p; break; }
        }
      } catch { /* 다음 스크립트 */ }
      if (price) break;
    }

    // JSON-LD 없을 때만 DOM 최종가 fallback — 취소선(base/origin price) 선택자는 절대 사용 금지
    if (!price) {
      const el = document.querySelector(
        ".prod-sale-price .total-price, .prod-coupon-price .total-price, span.total-price > strong, .total-price"
      );
      price = parsePrice(el?.textContent);
    }

    if (!price) return null;
    return [{ coupang_product_id: productId, price, is_ad: false }];
  }

  // ── 검색결과 페이지: 카드 단위 다중 추출 ──
  function extractSearchPage() {
    const results = [];
    const seen = new Set();
    // 상품 카드 = /vp/products/ 링크를 품은 li (레이아웃 개편 대비 넓게 잡고 링크로 판별)
    const cards = document.querySelectorAll("li");
    for (const card of cards) {
      const link = card.querySelector('a[href*="/vp/products/"]');
      const m = link?.getAttribute("href")?.match(/\/vp\/products\/(\d+)/);
      if (!m) continue;
      const productId = m[1];
      if (seen.has(productId)) continue; // (e) 카드 경계 준수 — 같은 ID 중복 카드 방지

      // (e) 광고 판별은 이 카드 내부에서만 검사
      const adBadge = card.querySelector('[class*="ad-badge"], [class*="AdMark"], [data-adsplatform]');
      const cardText = (card.innerText || "").slice(0, 300);
      const isAd = !!adBadge || /광고\b|쿠팡추천/.test(cardText);

      // (c) 최종 결제가만 — 취소선 <del>·base-price 제외 선택자
      let priceEl =
        card.querySelector("strong.price-value") ||
        card.querySelector('[class*="price-value"]') ||
        card.querySelector("em.sale > strong");
      if (priceEl && priceEl.closest("del")) priceEl = null; // 취소선 안이면 무효
      const price = parsePrice(priceEl?.textContent);
      if (!price) continue;

      seen.add(productId);
      results.push({ coupang_product_id: productId, price, is_ad: isAd });
    }
    return results.length > 0 ? results : null;
  }

  function extract() {
    if (location.pathname.startsWith("/vp/products/")) return extractProductPage();
    if (location.pathname.startsWith("/np/search")) return extractSearchPage();
    return null;
  }

  // SPA 렌더 지연 대비 재시도 후 background로 전송
  let attempt = 0;
  function tryExtract() {
    attempt += 1;
    const captures = extract();
    if (captures) {
      console.log(`[PG content] 추출 성공 (${attempt}회차):`, JSON.stringify(captures));
      chrome.runtime.sendMessage({
        type: "PG_RESULT",
        url: location.href,
        captures,
        captured_at: new Date().toISOString(),
      });
    } else if (attempt < MAX_RETRY) {
      setTimeout(tryExtract, RETRY_MS);
    } else {
      console.log(`[PG content] 추출 실패 — ${MAX_RETRY}회 재시도 소진:`, location.href);
      chrome.runtime.sendMessage({ type: "PG_RESULT", url: location.href, captures: [], failed: true });
    }
  }

  tryExtract();
})();
