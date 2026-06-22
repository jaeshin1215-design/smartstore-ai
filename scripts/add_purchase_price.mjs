import { createClient } from "@libsql/client";
import fs from "fs";

if (fs.existsSync(".env.local")) {
  const fileContent = fs.readFileSync(".env.local", "utf8");
  const lines = fileContent.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const eqIdx = trimmed.indexOf("=");
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_TOKEN;
const db = createClient({ url, authToken });

async function runAlter() {
  try {
    console.log("🚀 Running DDL ALTER TABLE for purchase_price column...");
    try {
      await db.execute("ALTER TABLE sellfit_products ADD COLUMN purchase_price REAL DEFAULT 0");
      console.log("✅ purchase_price column added successfully.");
    } catch (e) {
      console.log("ℹ️ purchase_price column skipped (likely already exists):", e.message);
    }
    console.log("🎉 Database schema migration completed!");
  } catch (err) {
    console.error("❌ Schema migration failed:", err.message);
  }
}

runAlter();
