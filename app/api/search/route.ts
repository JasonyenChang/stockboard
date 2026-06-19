import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/stocks";
import { FinMindError } from "@/lib/finmind";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const results = await searchStocks(q);
    return NextResponse.json({ results });
  } catch (err) {
    const status = err instanceof FinMindError ? err.status : 500;
    const message = err instanceof Error ? err.message : "搜尋失敗";
    return NextResponse.json({ error: message }, { status });
  }
}
