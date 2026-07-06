import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, "../.env.local"), "utf8").split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const db = createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
const STORE_ID = "984f8d32-6d13-402a-b251-9bedaf0b1f6a";

const r1 = await db.execute({
  sql: `SELECT
    MIN(order_date) as earliest,
    MAX(order_date) as latest,
    COUNT(*) as total_rows,
    COUNT(DISTINCT order_date) as distinct_days
   FROM sellfit_customer_orders WHERE store_id = ?`,
  args: [STORE_ID]
});
console.log("날짜 범위:", r1.rows[0]);

// 날짜별 주문 건수
const r2 = await db.execute({
  sql: `SELECT order_date, COUNT(*) as cnt
   FROM sellfit_customer_orders WHERE store_id = ?
   GROUP BY order_date ORDER BY order_date`,
  args: [STORE_ID]
});
console.log("\n날짜별 건수:");
r2.rows.forEach(row => console.log(` ${row.order_date}: ${row.cnt}건`));
