// SellFit Price Guard — background service worker (Manifest V3)
// 트리거 3단:
//   ① chrome.alarms 정시 (기본 06:00, 브라우저가 켜져 있을 때)
//   ② 캐치업: 브라우저 시작 시 "오늘 미수집이면 즉시" — 매일 1회를 사실상 보장
//   ③ Windows 작업 스케줄러는 README 안내 (선택)
// 예외 UX: 10:00 시점 미수집이면 알림 1건 → 클릭 시 즉시 수집
// 가격 결정·변경 기능 없음 — 읽기·기록만.

const DEFAULTS = {
  apiBase: "https://sellfit.kr",
  storeId: "",
  storeName: "",
  collectHour: 6,   // 정시 수집 시각 (PC 로컬 = KST)
  checkupHour: 10,  // 미수집 알림 시각
  collectLog: {},   // { 'YYYY-MM-DD': { count, at, trigger } }
};

const PAGE_TIMEOUT_MS = 25000;
const PAGE_GAP_MS = 3000; // 사람 열람 속도에 가까운 페이지 간격

async function getConfig() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextTimeOf(hour) {
  const t = new Date();
  t.setHours(hour, 0, 0, 0);
  if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1);
  return t.getTime();
}

async function ensureAlarms() {
  const cfg = await getConfig();
  await chrome.alarms.create("pg-collect", { when: nextTimeOf(cfg.collectHour), periodInMinutes: 1440 });
  await chrome.alarms.create("pg-checkup", { when: nextTimeOf(cfg.checkupHour), periodInMinutes: 1440 });
}

// ── 수집 대상 = Price Guard 보드 API에서 쿠팡 URL 연결된 상품 ──
async function fetchTargets(cfg) {
  const res = await fetch(`${cfg.apiBase}/api/price-capture?store_id=${encodeURIComponent(cfg.storeId)}`);
  if (!res.ok) throw new Error(`보드 API HTTP ${res.status}`);
  const data = await res.json();
  return (data.rows || [])
    .filter((r) => r.coupang_url)
    .map((r) => ({ url: r.coupang_url, name: r.product_name }));
}

async function postCaptures(cfg, captures) {
  const res = await fetch(`${cfg.apiBase}/api/price-capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ store_id: cfg.storeId, source: "extension", captures }),
  });
  if (!res.ok) throw new Error(`전송 실패 HTTP ${res.status}`);
  return res.json();
}

// 순회 수집 중인 탭 → resolve 콜백
const pendingTabs = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // content script 추출 결과
  if (msg?.type === "PG_RESULT") {
    const tabId = sender.tab?.id;
    if (tabId != null && pendingTabs.has(tabId)) {
      pendingTabs.get(tabId)(msg); // 순회 수집 응답
    } else {
      handlePassiveResult(msg); // 사람이 직접 연 페이지의 열람 수집
    }
    return;
  }
  // popup 요청
  if (msg?.type === "PG_COLLECT_NOW") {
    collectAll("manual").then(sendResponse);
    return true; // 비동기 응답
  }
  if (msg?.type === "PG_STATUS") {
    getConfig().then((cfg) => {
      sendResponse({
        storeId: cfg.storeId,
        storeName: cfg.storeName,
        apiBase: cfg.apiBase,
        collectedToday: !!cfg.collectLog[today()],
        collectLog: cfg.collectLog,
        collecting,
      });
    });
    return true;
  }
});

// 사람이 쿠팡을 열람 중일 때: 추적 상품이면 그 김에 기록 (추적 목록 외 상품은 절대 전송 안 함)
async function handlePassiveResult(msg) {
  try {
    const cfg = await getConfig();
    if (!cfg.storeId || !msg.captures?.length) return;
    const key = "pg_tracked_ids";
    let { [key]: tracked } = await chrome.storage.session.get(key);
    if (!tracked) {
      const targets = await fetchTargets(cfg);
      tracked = targets
        .map((t) => (t.url.match(/\/vp\/products\/(\d+)/) || [])[1])
        .filter(Boolean);
      await chrome.storage.session.set({ [key]: tracked });
    }
    const captures = msg.captures.filter((c) => tracked.includes(c.coupang_product_id));
    if (captures.length > 0) await postCaptures(cfg, captures);
  } catch { /* 열람 보조 수집 실패는 조용히 무시 */ }
}

// 최소화 창의 탭 하나에서 URL을 열고 content script 결과를 기다림
function captureInTab(windowId, url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ windowId, url, active: false }, (tab) => {
      if (!tab?.id) return resolve(null);
      const tabId = tab.id;
      const timer = setTimeout(() => {
        pendingTabs.delete(tabId);
        chrome.tabs.remove(tabId).catch(() => {});
        resolve(null);
      }, PAGE_TIMEOUT_MS);
      pendingTabs.set(tabId, (msg) => {
        clearTimeout(timer);
        pendingTabs.delete(tabId);
        chrome.tabs.remove(tabId).catch(() => {});
        resolve(msg.failed ? null : msg.captures);
      });
    });
  });
}

let collecting = false;

// ── 핵심: 백그라운드 최소화 창으로 등록 URL 순회 → 수집 → 전송 → 창 닫기 ──
async function collectAll(trigger) {
  if (collecting) return { skipped: "이미 수집 중" };
  collecting = true;
  let win = null;
  try {
    const cfg = await getConfig();
    if (!cfg.storeId) {
      notify("Price Guard 설정 필요", "확장 아이콘을 눌러 스토어 코드(6자리)를 입력하세요.");
      return { error: "storeId 미설정" };
    }
    const targets = await fetchTargets(cfg);
    if (targets.length === 0) {
      return { error: "쿠팡 URL 연결된 상품 없음 — SellFit Setup에서 '쿠팡 URL 연결'을 먼저 하세요" };
    }

    win = await chrome.windows.create({ url: "about:blank", focused: false, state: "minimized" });

    const all = [];
    for (const t of targets) {
      const captures = await captureInTab(win.id, t.url);
      if (captures?.length) all.push(...captures);
      await new Promise((r) => setTimeout(r, PAGE_GAP_MS));
    }

    if (all.length > 0) {
      await postCaptures(cfg, all);
      const log = { ...cfg.collectLog, [today()]: { count: all.length, at: new Date().toISOString(), trigger } };
      const keep = Object.keys(log).sort().slice(-14); // 최근 14일만 유지
      await chrome.storage.local.set({ collectLog: Object.fromEntries(keep.map((k) => [k, log[k]])) });
      notify("Price Guard 수집 완료", `${all.length}건 기록 — SellFit 가격 추적 보드에 반영됐습니다.`);
      return { ok: true, count: all.length, targets: targets.length };
    }
    notify("Price Guard 수집 실패", `${targets.length}개 상품에서 가격을 읽지 못했습니다. 쿠팡 페이지를 직접 열어 확인해주세요.`);
    return { error: "추출 0건", targets: targets.length };
  } catch (e) {
    return { error: String(e) };
  } finally {
    if (win?.id != null) chrome.windows.remove(win.id).catch(() => {});
    collecting = false;
  }
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    // 1px 투명 PNG (아이콘 파일 없이 알림 표시용)
    iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    title,
    message,
  });
}

async function collectedToday() {
  const cfg = await getConfig();
  return !!cfg.collectLog[today()];
}

// ── 트리거 ① 정시 알람 + 10시 미수집 체크 ──
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "pg-collect") {
    if (!(await collectedToday())) await collectAll("alarm");
  }
  if (alarm.name === "pg-checkup") {
    if (!(await collectedToday())) {
      notify("Price Guard 오늘 미수집", "이 알림을 클릭하면 지금 바로 수집합니다.");
    }
  }
});

// 알림 원클릭 → 즉시 수집
chrome.notifications.onClicked.addListener(async () => {
  if (!(await collectedToday())) await collectAll("notification");
});

// ── 트리거 ② 캐치업: 브라우저 시작 시 오늘 미수집이면 즉시 ──
chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarms();
  if (!(await collectedToday())) await collectAll("startup");
});

chrome.runtime.onInstalled.addListener(ensureAlarms);
