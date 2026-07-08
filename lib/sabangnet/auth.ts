import bcrypt from "bcryptjs";

// 로컬/Vercel: Fly.io 프록시 경유 (https://sellfit-proxy.fly.dev/sabangnet)
// Fly.io 프록시 → 사방넷(https://api.sabangnet.co.kr) 로 포워드 (등록 IP: 137.66.51.115)
const BASE_URL = process.env.SABANGNET_BASE_URL || "https://api.sabangnet.co.kr";
const PROXY_SECRET = process.env.SELLFIT_PROXY_SECRET;

export class SabangnetAuthError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "SabangnetAuthError";
  }
}

function getConfig() {
  const clientCd = process.env.SABANGNET_CLIENT_ID;
  const secret = process.env.SABANGNET_CLIENT_SECRET;
  const acntId = process.env.SABANGNET_ACNT_ID;
  const missing: string[] = [];
  if (!clientCd) missing.push("SABANGNET_CLIENT_ID");
  if (!secret) missing.push("SABANGNET_CLIENT_SECRET");
  if (!acntId) missing.push("SABANGNET_ACNT_ID");
  if (missing.length > 0) throw new SabangnetAuthError(`환경변수 미설정: ${missing.join(", ")}`);
  return { clientCd: clientCd!, secret: secret!, acntId: acntId! };
}

/**
 * secretSign 생성
 * plaintext = clientCd + "_" + timestamp (Unix ms)
 * hash = BCrypt.hashpw(plaintext, secret)  ← secret이 salt 역할
 * secretSign = Base64(hash)
 */
function buildSecretSign(clientCd: string, secret: string, timestamp: number): string {
  const plaintext = `${clientCd}_${timestamp}`;
  const hash = bcrypt.hashSync(plaintext, secret);
  return Buffer.from(hash).toString("base64");
}

/** JWT 토큰 발급 */
export async function fetchSabangnetToken(): Promise<string> {
  const { clientCd, secret } = getConfig();
  const timestamp = Date.now();
  const secretSign = buildSecretSign(clientCd, secret, timestamp);

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    clientType: "SB_APP",
    clientCd,
    timestamp: String(timestamp),
    secretSign,
    authMode: "PRODUCTION",
  });

  const tokenHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (PROXY_SECRET) tokenHeaders["x-proxy-secret"] = PROXY_SECRET;

  const res = await fetch(`${BASE_URL}/oauth2/token`, {
    method: "POST",
    headers: tokenHeaders,
    body: params.toString(),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new SabangnetAuthError(
      `토큰 발급 실패 (HTTP ${res.status}): ${text}`,
      String(res.status)
    );
  }

  const data = JSON.parse(text) as { access_token: string; token_type: string; expires_in: number };
  return data.access_token;
}

/** 인증 헤더 포함 사방넷 API 호출 공통 래퍼 */
export async function sabangnetFetch<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { acntId } = getConfig();
  const token = await fetchSabangnetToken();

  const apiHeaders: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "X-Svc-Acnt-Id": acntId,
    "Content-Type": "application/json",
  };
  if (PROXY_SECRET) apiHeaders["x-proxy-secret"] = PROXY_SECRET;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: apiHeaders,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new SabangnetAuthError(
      `사방넷 API 호출 실패 (HTTP ${res.status}): ${text}`,
      String(res.status)
    );
  }
  return JSON.parse(text) as T;
}
