import { NextRequest, NextResponse } from "next/server";
import { finmindFetch, daysAgo, today, FinMindError } from "@/lib/finmind";
import type { FinancialRow } from "@/lib/types";

interface RawFin {
  date: string;
  type: string; // English key, e.g. Revenue, EPS
  value: number;
  origin_name: string; // Chinese label
}

// Curated income-statement line items, in display order.
const LINE_ITEMS: { key: string; label: string }[] = [
  { key: "Revenue", label: "營業收入" },
  { key: "GrossProfit", label: "營業毛利" },
  { key: "OperatingIncome", label: "營業利益" },
  { key: "PreTaxIncome", label: "稅前淨利" },
  { key: "IncomeAfterTaxes", label: "稅後淨利" },
  { key: "EPS", label: "每股盈餘 (EPS)" },
];

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "缺少股票代號" }, { status: 400 });

  try {
    // FinMind reports SINGLE-QUARTER values (單季). We fetch 3 years so that
    // every displayed quarter's calendar year is complete, letting us derive
    // the year-to-date 累計 figure by summing earlier quarters of the same year.
    const rows = await finmindFetch<RawFin>({
      dataset: "TaiwanStockFinancialStatements",
      data_id: id,
      start_date: daysAgo(365 * 3 + 30),
      end_date: today(),
    });

    if (!rows.length) {
      return NextResponse.json({ rows: [], dates: [] });
    }

    const allDates = Array.from(new Set(rows.map((r) => r.date))).sort((a, b) =>
      a.localeCompare(b)
    ); // ascending — needed for cumulative running sum
    // The 8 most recent quarters, shown newest-first.
    const dates = allDates.slice(-8).reverse();

    const byKeyDate = new Map<string, number>();
    for (const r of rows) {
      byKeyDate.set(`${r.type}|${r.date}`, r.value);
    }

    // Year-to-date cumulative = sum of single-quarter values in the same
    // calendar year up to and including that quarter.
    function cumulativeFor(key: string, date: string): number {
      const year = date.slice(0, 4);
      let sum = 0;
      let seen = false;
      for (const d of allDates) {
        if (d.slice(0, 4) !== year || d > date) continue;
        const v = byKeyDate.get(`${key}|${d}`);
        if (v !== undefined && !Number.isNaN(v)) {
          sum += v;
          seen = true;
        }
      }
      return seen ? sum : NaN;
    }

    const result: FinancialRow[] = LINE_ITEMS.map((item) => ({
      label: item.label,
      key: item.key,
      values: dates.map((d) => ({
        date: d,
        quarter: byKeyDate.get(`${item.key}|${d}`) ?? NaN,
        cumulative: cumulativeFor(item.key, d),
      })),
    })).filter((row) => row.values.some((v) => !Number.isNaN(v.quarter)));

    return NextResponse.json({ rows: result, dates });
  } catch (err) {
    const status = err instanceof FinMindError ? err.status : 500;
    const message = err instanceof Error ? err.message : "讀取財報失敗";
    return NextResponse.json({ error: message }, { status });
  }
}
