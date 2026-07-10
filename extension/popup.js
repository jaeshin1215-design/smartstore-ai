// SellFit Price Guard — popup
// 스토어 코드(6자리 PIN) + 확장 토큰 → SellFit API 인증 후 chrome.storage.local에 저장.
// 상태는 storage에서 직접 읽는다 (서비스워커 잠듦/구버전에 의존하지 않게 — 2026-07-10 저장유실 수정).

const $ = (id) => document.getElementById(id);

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// storage에서 직접 로드 (source of truth). collecting 여부만 background에 물어봄(있으면).
async function loadState() {
  const s = await chrome.storage.local.get(["storeId", "storeName", "extToken", "collectLog"]);
  let collecting = false;
  try {
    const st = await chrome.runtime.sendMessage({ type: "PG_STATUS" });
    collecting = !!st?.collecting;
  } catch { /* 서비스워커 무응답이어도 저장 상태 표시엔 영향 없음 */ }
  return {
    storeId: s.storeId || "",
    storeName: s.storeName || "",
    hasToken: !!s.extToken,
    collectLog: s.collectLog || {},
    collecting,
  };
}

async function refresh() {
  const status = await loadState();
  const box = $("statusBox");

  if (!status.storeId || !status.hasToken) {
    box.innerHTML = `<span class="warn">${!status.storeId ? "스토어 미연결" : "확장 토큰 미설정"}</span><br/>스토어 코드와 확장 토큰을 입력하세요.`;
    $("setupRow").style.display = "block";
    $("collectBtn").disabled = true;
    return;
  }

  // 주간 수집률 (최근 7일)
  const days = [];
  let hit = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const collected = !!status.collectLog[dateKey(d)];
    if (collected) hit++;
    days.push(`<div class="day${collected ? " hit" : ""}">${d.getDate()}</div>`);
  }

  const todayLog = status.collectLog[dateKey(new Date())];
  box.innerHTML = `
    스토어: <b>${status.storeName || status.storeId.substring(0, 8)}</b><br/>
    오늘: ${todayLog ? `<span class="ok">수집 완료 (${todayLog.count}건)</span>` : `<span class="warn">미수집</span>`}<br/>
    주간 수집률: <b>${hit}/7일</b>
    <div class="weekly">${days.join("")}</div>
  `;
  $("setupRow").style.display = "none";
  $("collectBtn").disabled = !!status.collecting;
  $("collectBtn").textContent = status.collecting ? "수집 중..." : "지금 수집 →";
}

$("saveBtn").addEventListener("click", async () => {
  const pin = $("pinInput").value.trim();
  const token = $("tokenInput").value.trim();
  if (pin.length !== 6) { $("msg").textContent = "6자리 코드를 입력하세요."; return; }
  if (!token.startsWith("sfext_")) { $("msg").textContent = "확장 토큰을 입력하세요 (sfext_로 시작)."; return; }
  $("msg").textContent = "확인 중...";
  try {
    const { apiBase } = { apiBase: "https://sellfit.kr", ...(await chrome.storage.local.get("apiBase")) };
    const res = await fetch(`${apiBase}/api/stores?pin=${pin}`, {
      headers: { "x-extension-token": token },
    });
    if (res.status === 401) { $("msg").textContent = "확장 토큰이 올바르지 않습니다."; return; }
    const data = await res.json();
    if (!data.store) { $("msg").textContent = "코드가 맞지 않습니다."; return; }

    // 저장 후 read-back으로 실제 기록을 검증 — 검증 통과해야만 "연결 완료" 표시
    await chrome.storage.local.set({ storeId: data.store.id, storeName: data.store.name, extToken: token });
    const check = await chrome.storage.local.get(["storeId", "extToken"]);
    if (check.storeId !== data.store.id || check.extToken !== token) {
      $("msg").textContent = "저장에 실패했습니다. 다시 시도해 주세요.";
      return;
    }
    $("msg").textContent = `연결 완료: ${data.store.name}`;
    await refresh(); // 경고 해제 + 수집 버튼 활성까지 한 동작으로
  } catch {
    $("msg").textContent = "네트워크 오류 — 다시 시도하세요.";
  }
});

$("collectBtn").addEventListener("click", async () => {
  $("collectBtn").disabled = true;
  $("collectBtn").textContent = "수집 중... (창이 최소화로 열렸다 닫힙니다)";
  $("msg").textContent = "";
  const result = await chrome.runtime.sendMessage({ type: "PG_COLLECT_NOW" });
  $("collectBtn").textContent = "지금 수집 →";
  $("collectBtn").disabled = false;
  if (result?.ok) $("msg").textContent = `완료 — ${result.count}건 기록됨`;
  else $("msg").textContent = result?.error || result?.skipped || "실패";
  await refresh();
});

refresh();
