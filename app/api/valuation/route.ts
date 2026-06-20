import { NextRequest, NextResponse } from "next/server";
import { finmindFetch, daysAgo, today, FinMindError } from "@/lib/finmind";
import type { Valuation } from "@/lib/types";

interface RawPER {
  date: string;
  PER: number;
}

interface RawPrice {
  date: string;
  close: number;
}

const YEARS = 5;

function percentile(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "缺少股票代號" }, { status: 400 });

  try {
    const [rawPer, rawPrice] = await Promise.all([
      finmindFetch<RawPER>({
        dataset: "TaiwanStockPER",
        data_id: id,
        start_date: daysAgo(365 * YEARS),
        end_date: today(),
      }),
      finmindFetch<RawPrice>({
        dataset: "TaiwanStockPrice",
        data_id: id,
        start_date: daysAgo(14),
        end_date: today(),
      }).catch(() => [] as RawPrice[]),
    ]);

    const pers = rawPer
      .map((r) => r.PER)
      .filter((p) => p > 0)
      .sort((a, b) => a - b);

    const lastPerRow = [...rawPer].reverse().find((r) => r.PER > 0);
    const lastClose = rawPrice.length
      ? rawPrice[rawPrice.length - 1].close
      : NaN;

    // PE-band valuation only makes sense with a positive PER (profitable firm).
    if (pers.length < 60 || !lastPerRow || !(lastClose > 0)) {
      return NextResponse.json({ valuation: null });
    }

    const currentPer = lastPerRow.PER;
    const eps = lastClose / currentPer; // trailing EPS implied by price/PER

    const cheap = percentile(pers, 20) * eps;
    const fair = percentile(pers, 50) * eps;
    const expensive = percentile(pers, 80) * eps;

    const label: Valuation["label"] =
      lastClose <= cheap ? "便宜" : lastClose >= expensive ? "昂貴" : "合理";

    const valuation: Valuation = {
      eps,
      cheap,
      fair,
      expensive,
      price: lastClose,
      per: currentPer,
      label,
      years: YEARS,
    };

    return NextResponse.json({ valuation });
  } catch (err) {
    const status = err instanceof FinMindError ? err.status : 500;
    const message = err instanceof Error ? err.message : "讀取估價失敗";
    return NextResponse.json({ error: message }, { status });
  }
}
