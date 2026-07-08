import { createHmac } from "crypto";
import type {
  CoupangOrdersResponse,
  CoupangSettlementsResponse,
  CoupangSellerProductsResponse,
  CoupangSellerProductDetailResponse,
  CoupangLegacyDetailItem,
  CoupangDualDetailItem,
  CoupangChannelItemData,
  NormalizedProductOption,
  NormalizedSellerProduct,
} from "./types";

// 로컬/Vercel: Fly.io 프록시 경유 (https://sellfit-proxy.fly.dev/coupang)
// 서명은 실제 API path 기준으로 계산, 요청 URL만 프록시로 전달
const BASE_URL = process.env.COUPANG_BASE_URL || "https://api-gateway.coupang.com";
const PROXY_SECRET = process.env.SELLFIT_PROXY_SECRET;

export class CoupangError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "CoupangError";
  }
}

function getConfig() {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  const vendorId = process.env.COUPANG_VENDOR_ID;
  const missing = [];
  if (!accessKey) missing.push("COUPANG_ACCESS_KEY");
  if (!secretKey) missing.push("COUPANG_SECRET_KEY");
  if (!vendorId) missing.push("COUPANG_VENDOR_ID");
  if (missing.length > 0) throw new CoupangError(`환경변수 미설정: ${missing.join(", ")}`);
  return { accessKey: accessKey!, secretKey: secretKey!, vendorId: vendorId! };
}

/** UTC datetime → YYMMDDTHHmmssZ 형식 (2자리 연도, 쿠팡 Wing 공식 규격) */
function toDatetimeStr(date: Date): string {
  const iso = date.toISOString();
  return iso.substring(2, 4) + iso.substring(5, 7) + iso.substring(8, 10)
    + "T" + iso.substring(11, 13) + iso.substring(14, 16) + iso.substring(17, 19) + "Z";
}

/**
 * 쿠팡 Wing Open API HMAC-SHA256 서명 생성
 * 서명 대상: datetime + method(소문자) + path + queryString (구분자 없음)
 * 공식 문서 예시: "20171101T021520Zgetv2/providers/.../time-framecreatedAtFrom=..."
 */
function buildAuthorization(
  method: string,
  path: string,
  queryString: string,
  datetime: string,
  accessKey: string,
  secretKey: string
): string {
  const message = datetime + method.toUpperCase() + path + queryString;
  const signature = createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

/** 공통 API 호출 래퍼 */
async function coupangFetch<T>(
  method: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const { accessKey, secretKey, vendorId } = getConfig();
  const datetime = toDatetimeStr(new Date());
  const queryString = params ? new URLSearchParams(params).toString() : "";
  const url = `${BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;

  const authorization = buildAuthorization(
    method,
    path,
    queryString,
    datetime,
    accessKey,
    secretKey
  );

  const headers: Record<string, string> = {
    Authorization: authorization,
    "Content-Type": "application/json;charset=UTF-8",
    "X-Requested-By": vendorId,
  };
  if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

  const res = await fetch(url, {
    method,
    headers,
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    throw new CoupangError(
      `쿠팡 Wing API 호출 실패 (HTTP ${res.status}): ${text}`,
      String(res.status)
    );
  }

  return JSON.parse(text) as T;
}

/** 주문 목록 조회 */
export async function getOrders(
  vendorId: string,
  params: {
    createdAtFrom: string; // "2024-01-01T00:00:00"
    createdAtTo: string;   // "2024-01-31T23:59:59"
    status?: string;
    maxPerPage?: number;
    nextToken?: string;
  }
): Promise<CoupangOrdersResponse> {
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets`;
  const queryParams: Record<string, string> = {
    createdAtFrom: params.createdAtFrom,
    createdAtTo: params.createdAtTo,
  };
  if (params.status) queryParams.status = params.status;
  if (params.maxPerPage) queryParams.maxPerPage = String(params.maxPerPage);
  if (params.nextToken) queryParams.nextToken = params.nextToken;

  return coupangFetch<CoupangOrdersResponse>("GET", path, queryParams);
}

/**
 * 상품 목록 페이징 조회 (마켓플레이스·로켓그로스·동시운영 공용)
 * 공식 라우트: seller_api — 이전에 쓰던 openapi/v4/vendors/.../products 는 존재하지 않는 경로 (404 원인)
 * 응답은 요약 정보만 포함, 가격·옵션은 getSellerProduct 단건 조회로 확인
 */
export async function getSellerProducts(
  vendorId: string,
  params?: { nextToken?: string; maxPerPage?: number; status?: string }
): Promise<CoupangSellerProductsResponse> {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`;
  const queryParams: Record<string, string> = { vendorId };
  if (params?.maxPerPage) queryParams.maxPerPage = String(params.maxPerPage);
  if (params?.nextToken) queryParams.nextToken = params.nextToken;
  if (params?.status) queryParams.status = params.status;

  return coupangFetch<CoupangSellerProductsResponse>("GET", path, queryParams);
}

/**
 * 상품 단건 조회 — endpoint는 하나, 응답 스키마는 상품 유형에 따라 둘
 * - 판매자배송 전용 상품 → 기존 스키마 (items[]에 salePrice 평면)
 * - 로켓그로스·동시운영 상품 → 신규 스키마 (rocketGrowthItemData/marketplaceItemData)
 * raw 응답을 반환하며, 스키마 판별·정규화는 parseSellerProduct 사용
 */
export async function getSellerProduct(
  sellerProductId: number | string
): Promise<CoupangSellerProductDetailResponse> {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}`;
  return coupangFetch<CoupangSellerProductDetailResponse>("GET", path);
}

/** 신규 스키마 아이템 여부 판별 — rocketGrowthItemData/marketplaceItemData 키 존재가 기준 */
function isDualSchemaItem(
  item: CoupangLegacyDetailItem | CoupangDualDetailItem
): item is CoupangDualDetailItem {
  return (
    Object.prototype.hasOwnProperty.call(item, "rocketGrowthItemData") ||
    Object.prototype.hasOwnProperty.call(item, "marketplaceItemData")
  );
}

/** 신규 스키마 채널 데이터 → 정규화 옵션 */
function channelToOption(
  itemName: string,
  channel: "MARKETPLACE" | "ROCKET_GROWTH",
  data: CoupangChannelItemData
): NormalizedProductOption {
  return {
    itemName,
    channel,
    vendorItemId: data.vendorItemId ?? null,
    originalPrice: data.priceData?.originalPrice ?? null,
    salePrice: data.priceData?.salePrice ?? null,
    externalVendorSku: data.externalVendorSku,
  };
}

/**
 * 단건 조회 응답을 스키마와 무관한 공통 구조로 정규화
 * schemaType 자체가 판매방식의 물적 증거:
 * - "legacy" = 판매자배송 전용 상품
 * - "rocketGrowth" = 로켓그로스 또는 동시운영 상품
 */
export function parseSellerProduct(
  res: CoupangSellerProductDetailResponse
): NormalizedSellerProduct {
  const { data } = res;
  const items = data.items ?? [];
  const dual = items.length > 0 && items.every(isDualSchemaItem);

  const options: NormalizedProductOption[] = [];
  for (const item of items) {
    if (isDualSchemaItem(item)) {
      if (item.rocketGrowthItemData) {
        options.push(channelToOption(item.itemName, "ROCKET_GROWTH", item.rocketGrowthItemData));
      }
      if (item.marketplaceItemData) {
        options.push(channelToOption(item.itemName, "MARKETPLACE", item.marketplaceItemData));
      }
    } else {
      const legacy = item as CoupangLegacyDetailItem;
      options.push({
        itemName: legacy.itemName,
        channel: "MARKETPLACE",
        vendorItemId: legacy.vendorItemId ?? null,
        originalPrice: legacy.originalPrice ?? null,
        salePrice: legacy.salePrice ?? null,
        externalVendorSku: legacy.externalVendorSku,
      });
    }
  }

  return {
    schemaType: dual ? "rocketGrowth" : "legacy",
    sellerProductId: data.sellerProductId,
    sellerProductName: data.sellerProductName,
    statusName: data.statusName,
    vendorId: data.vendorId,
    options,
  };
}

/** 정산 목록 조회 */
export async function getSettlements(
  vendorId: string,
  params: {
    startAt: string; // "yyyyMMdd"
    endAt: string;
    nextToken?: string;
    maxPerPage?: number;
  }
): Promise<CoupangSettlementsResponse> {
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/settlements`;
  const queryParams: Record<string, string> = {
    startAt: params.startAt,
    endAt: params.endAt,
  };
  if (params.nextToken) queryParams.nextToken = params.nextToken;
  if (params.maxPerPage) queryParams.maxPerPage = String(params.maxPerPage);

  return coupangFetch<CoupangSettlementsResponse>("GET", path, queryParams);
}

/** 환경변수 설정 여부 확인 */
export function checkCoupangConfig(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.COUPANG_ACCESS_KEY) missing.push("COUPANG_ACCESS_KEY");
  if (!process.env.COUPANG_SECRET_KEY) missing.push("COUPANG_SECRET_KEY");
  if (!process.env.COUPANG_VENDOR_ID) missing.push("COUPANG_VENDOR_ID");
  return { ok: missing.length === 0, missing };
}
