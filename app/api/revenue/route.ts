import { NextRequest, NextResponse } from "next/server";
import { finmindFetch, daysAgo, today, FinMindError } from "@/lib/finmind";
import type { RevenuePoint } from "@/lib/types";

interface RawRevenue {
  revenue: number;
  revenue_month: number; // actual revenue month (NOT the `date` field)
  revenue_year: number;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "缺少股票代號" }, { status: 400 });

  try {
    // Fetch ~3 years so the oldest displayed month still has a prior-year
    // comparison for the YoY calculation.
    const rows = await finmindFetch<RawRevenue>({
      dataset: "TaiwanStockMonthRevenue",
      data_id: id,
      start_date: daysAgo(365 * 3 + 60),
      end_date: today(),
    });

    if (!rows.length) return NextResponse.json({ revenue: [] });

    const byKey = new Map<string, number>();
    for (const r of rows) {
      byKey.set(`${r.revenue_year}-${r.revenue_month}`, r.revenue);
    }

    const sorted = rows
      .map((r) => ({ year: r.revenue_year, month: r.revenue_month }))
      .filter(
        (v, i, arr) =>
          arr.findIndex((x) => x.year === v.year && x.month === v.month) === i
      )
      .sort((a, b) => a.year - b.year || a.month - b.month);

    const revenue: RevenuePoint[] = sorted
      .map(({ year, month }) => {
        const rev = byKey.get(`${year}-${month}`) ?? NaN;
        const prev = byKey.get(`${year - 1}-${month}`);
        const yoy =
          prev != null && prev > 0 ? ((rev - prev) / prev) * 100 : null;
        return { year, month, revenue: rev, yoy };
      })
      .slice(-12); // most recent 12 months

    return NextResponse.json({ revenue });
  } catch (err) {
    const status = err instanceof FinMindError ? err.status : 500;
    const message = err instanceof Error ? err.message : "讀取月營收失敗";
    return NextResponse.json({ error: message }, { status });
  }
}
