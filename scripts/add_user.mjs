// SellFit 사용자 추가 (초대제 allowlist) — 배포 없이 실행만으로 끝
// 사용: node scripts/add_user.mjs <email> <store_id>
// 예:  node scripts/add_user.mjs daseul@easystory.kr 984f8d32-6d13-402a-b251-9bedaf0b1f6a
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const db = createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });

const [email, storeId] = process.argv.slice(2);
if (!email || !storeId) {
  console.error("사용법: node scripts/add_user.mjs <email> <store_id>");
  process.exit(1);
}

const existing = await db.execute({ sql: "SELECT id FROM sellfit_users WHERE email = ?", args: [email.toLowerCase()] });
if (existing.rows.length > 0) {
  console.log(`이미 등록됨: ${email}`);
  process.exit(0);
}
await db.execute({
  sql: "INSERT INTO sellfit_users (id, email, store_id) VALUES (?, ?, ?)",
  args: [randomUUID(), email.toLowerCase(), storeId],
});
const all = await db.execute("SELECT email, store_id FROM sellfit_users");
console.log(`추가 완료: ${email} → ${storeId}`);
console.log("전체 사용자:", all.rows.map((r) => r.email).join(", "));
