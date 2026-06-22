import { createClient } from "@libsql/client";
import fs from "fs";

// Load environment variables
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
    console.log("🚀 Running DDL ALTER TABLE for matrix coordinates & confirmed flag...");
    
    // 1. matrix_x 추가
    try {
      await db.execute("ALTER TABLE sellfit_products ADD COLUMN matrix_x REAL");
      console.log("✅ matrix_x column added successfully.");
    } catch (e) {
      console.log("ℹ️ matrix_x column skipped (likely already exists):", e.message);
    }

    // 2. matrix_y 추가
    try {
      await db.execute("ALTER TABLE sellfit_products ADD COLUMN matrix_y REAL");
      console.log("✅ matrix_y column added successfully.");
    } catch (e) {
      console.log("ℹ️ matrix_y column skipped (likely already exists):", e.message);
    }

    // 3. is_price_confirmed 추가
    try {
      await db.execute("ALTER TABLE sellfit_products ADD COLUMN is_price_confirmed INTEGER DEFAULT 0");
      console.log("✅ is_price_confirmed column added successfully.");
    } catch (e) {
      console.log("ℹ️ is_price_confirmed column skipped (likely already exists):", e.message);
    }

    console.log("🎉 Database schema migration completed!");
  } catch (err) {
    console.error("❌ Schema migration failed:", err.message);
  }
}

runAlter();
