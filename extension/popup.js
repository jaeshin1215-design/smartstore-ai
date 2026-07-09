// SellFit Price Guard — popup
// 스토어 코드(6자리 PIN) → SellFit API로 store_id 해석 후 저장. 수동 수집 + 주간 수집률 표시.

const $ = (id) => document.getElementById(id);

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function refresh() {
  const status = await chrome.runtime.sendMessage({ type: "PG_STATUS" });
  const box = $("statusBox");

  if (!status.storeId) {
    box.innerHTML = `<span class="warn">스토어 미연결</span><br/>SellFit 스토어 코드를 입력하세요.`;
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
  if (status.collecting) $("collectBtn").textContent = "수집 중...";
}

$("saveBtn").addEventListener("click", async () => {
  const pin = $("pinInput").value.trim();
  if (pin.length !== 6) { $("msg").textContent = "6자리 코드를 입력하세요."; return; }
  $("msg").textContent = "확인 중...";
  try {
    const { apiBase } = { apiBase: "https://sellfit.kr", ...(await chrome.storage.local.get("apiBase")) };
    const res = await fetch(`${apiBase}/api/stores?pin=${pin}`);
    const data = await res.json();
    if (!data.store) { $("msg").textContent = "코드가 맞지 않습니다."; return; }
    await chrome.storage.local.set({ storeId: data.store.id, storeName: data.store.name });
    $("msg").textContent = `연결 완료: ${data.store.name}`;
    await refresh();
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
