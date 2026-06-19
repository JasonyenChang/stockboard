import { NextRequest, NextResponse } from "next/server";
import { finmindFetch, daysAgo, today, FinMindError } from "@/lib/finmind";
import type { DividendYear } from "@/lib/types";

interface RawDividend {
  date: string;
  year: string; // 股利所屬年度 (earnings year) — NOT what we group by
  CashEarningsDistribution: number;
  CashStatutorySurplus: number;
  StockEarningsDistribution: number;
  StockStatutorySurplus: number;
  CashExDividendTradingDate: string; // 現金除息日
  StockExDividendTradingDate: string; // 股票除權日
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "缺少股票代號" }, { status: 400 });

  try {
    // Dividends are paid ~1 year after the attribution year and some firms now
    // distribute quarterly, so fetch a wide window and aggregate by ROC year.
    const rows = await finmindFetch<RawDividend>({
      dataset: "TaiwanStockDividend",
      data_id: id,
      start_date: daysAgo(365 * 7),
      end_date: today(),
    });

    const byYear = new Map<number, DividendYear>();
    for (const r of rows) {
      // Group by the year the dividend went ex (除息/除權), falling back to the
      // record date; this matches wantgoo and most broker sites.
      const exDate =
        r.CashExDividendTradingDate || r.StockExDividendTradingDate || r.date;
      const m = /^(\d{4})/.exec(exDate ?? "");
      if (!m) continue;
      const year = Number(m[1]);
      const cash =
        (r.CashEarningsDistribution ?? 0) + (r.CashStatutorySurplus ?? 0);
      const stock =
        (r.StockEarningsDistribution ?? 0) + (r.StockStatutorySurplus ?? 0);
      const entry =
        byYear.get(year) ?? { year, cash: 0, stock: 0, total: 0 };
      entry.cash += cash;
      entry.stock += stock;
      entry.total = entry.cash + entry.stock;
      byYear.set(year, entry);
    }

    const dividends = Array.from(byYear.values())
      .sort((a, b) => b.year - a.year)
      .slice(0, 5);

    return NextResponse.json({ dividends });
  } catch (err) {
    const status = err instanceof FinMindError ? err.status : 500;
    const message = err instanceof Error ? err.message : "讀取股利失敗";
    return NextResponse.json({ error: message }, { status });
  }
}
