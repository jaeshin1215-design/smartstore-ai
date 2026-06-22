import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  const log: string[] = [];
  try {
    await db.execute(`ALTER TABLE mezzanine_brands ADD COLUMN serp_rank INTEGER DEFAULT 0`);
    log.push("✅ brands.serp_rank");
  } catch {
    log.push("⏭ brands.serp_rank already exists");
  }
  return NextResponse.json({ ok: true, log });
}
