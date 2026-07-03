// ─────────────────────────────────────────────────────────────────────
// 사방넷 API 클라이언트
// API 키 없을 때 "사방넷 API 키 미설정" 에러로 안전 종료.
// 실제 엔드포인트·인증 방식은 https://sabangnet.co.kr/RTL_API/guide/ 확인 후 보정.
// TODO: API 키 수령 후 BASE_URL + 인증 헤더 업데이트 필요
// ─────────────────────────────────────────────────────────────────────

// TODO: 사방넷 API 가이드에서 실제 베이스 URL 확인 필요
const SABANGNET_BASE_URL = "https://www.sabangnet.co.kr/RTL_API";

export class SabangnetError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "SabangnetError";
  }
}

function getApiKey(): string {
  const key = process.env.SABANGNET_API_KEY;
  if (!key) throw new SabangnetError("사방넷 API 키 미설정 (환경변수 SABANGNET_API_KEY)");
  return key;
}

// TODO: 사방넷 API가 shop_id 별도 요구 시 환경변수 추가
function getShopId(): string {
  const id = process.env.SABANGNET_SHOP_ID;
  if (!id) throw new SabangnetError("사방넷 Shop ID 미설정 (환경변수 SABANGNET_SHOP_ID)");
  return id;
}

/**
 * 사방넷 API POST 공통 래퍼
 * TODO: 실제 인증 방식(헤더 vs 파라미터)은 가이드 확인 후 수정
 */
export async function sabangnetPost<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey();
  const shopId = getShopId();

  const url = `${SABANGNET_BASE_URL}/${endpoint}`;

  // TODO: 사방넷 인증 방식 확인 후 아래 헤더/body 구조 수정
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "sabang-api-key": apiKey,   // TODO: 실제 헤더명 확인
      "sabang-shop-id": shopId,   // TODO: 실제 헤더명 확인
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SabangnetError(
      `사방넷 API 호출 실패 (HTTP ${res.status}): ${text}`,
      String(res.status)
    );
  }

  const data = await res.json() as T & { result?: string; message?: string };

  if (data.result === "fail") {
    throw new SabangnetError(
      `사방넷 API 오류: ${data.message ?? "알 수 없는 오류"}`,
      "SABANGNET_FAIL"
    );
  }

  return data;
}

/**
 * 환경변수 설정 여부 프리플라이트 확인
 * API 호출 전 설정 상태를 미리 점검할 때 사용
 */
export function checkSabangnetConfig(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.SABANGNET_API_KEY) missing.push("SABANGNET_API_KEY");
  if (!process.env.SABANGNET_SHOP_ID) missing.push("SABANGNET_SHOP_ID");
  return { ok: missing.length === 0, missing };
}
