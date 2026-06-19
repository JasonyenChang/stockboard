import { NextRequest, NextResponse } from "next/server";
import { finmindFetch, daysAgo, today, FinMindError } from "@/lib/finmind";
import type { InstitutionPoint, MarginPoint, ForeignHolding } from "@/lib/types";

interface RawInst {
  date: string;
  name: string;
  buy: number;
  sell: number;
}

interface RawMargin {
  date: string;
  MarginPurchaseTodayBalance: number;
  ShortSaleTodayBalance: number;
}

interface RawShareholding {
  date: string;
  ForeignInvestmentShares: number;
  NumberOfSharesIssued: number;
  ForeignInvestmentSharesRatio: number;
  ForeignInvestmentRemainRatio: number;
}

interface RawPrice {
  date: string;
  Trading_Volume: number;
}

// FinMind investor "name" values mapped to our three buckets.
function bucketOf(name: string): "foreign" | "trust" | "dealer" | null {
  if (name.startsWith("Foreign")) return "foreign";
  if (name === "Investment_Trust") return "trust";
  if (name.startsWith("Dealer")) return "dealer";
  return null;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  const days = Number(req.nextUrl.searchParams.get("days") ?? "120");
  if (!id) return NextResponse.json({ error: "缺少股票代號" }, { status: 400 });

  try {
    const start = daysAgo(Number.isFinite(days) ? days : 120);
    const [rawInst, rawMargin, rawShare, rawPrice] = await Promise.all([
      finmindFetch<RawInst>({
        dataset: "TaiwanStockInstitutionalInvestorsBuySell",
        data_id: id,
        start_date: start,
        end_date: today(),
      }).catch(() => [] as RawInst[]),
      finmindFetch<RawMargin>({
        dataset: "TaiwanStockMarginPurchaseShortSale",
        data_id: id,
        start_date: start,
        end_date: today(),
      }).catch(() => [] as RawMargin[]),
      finmindFetch<RawShareholding>({
        dataset: "TaiwanStockShareholding",
        data_id: id,
        start_date: daysAgo(14),
        end_date: today(),
      }).catch(() => [] as RawShareholding[]),
      finmindFetch<RawPrice>({
        dataset: "TaiwanStockPrice",
        data_id: id,
        start_date: start,
        end_date: today(),
      }).catch(() => [] as RawPrice[]),
    ]);

    // Daily total trading volume (shares) keyed by date.
    const volumeByDate = new Map<string, number>();
    for (const r of rawPrice) volumeByDate.set(r.date, r.Trading_Volume);

    // Aggregate institutional net buy (shares) per date.
    const byDate = new Map<string, InstitutionPoint>();
    for (const r of rawInst) {
      const bucket = bucketOf(r.name);
      if (!bucket) continue;
      const point =
        byDate.get(r.date) ??
        {
          date: r.date,
          foreign: 0,
          trust: 0,
          dealer: 0,
          volume: volumeByDate.get(r.date) ?? NaN,
        };
      point[bucket] += (r.buy ?? 0) - (r.sell ?? 0);
      byDate.set(r.date, point);
    }
    const institutions: InstitutionPoint[] = Array.from(byDate.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    const margin: MarginPoint[] = rawMargin
      .map((r) => ({
        date: r.date,
        marginBalance: r.MarginPurchaseTodayBalance,
        shortBalance: r.ShortSaleTodayBalance,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Latest foreign-investor shareholding snapshot.
    const latestShare = rawShare
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    const foreignHolding: ForeignHolding | null = latestShare
      ? {
          date: latestShare.date,
          shares: latestShare.ForeignInvestmentShares,
          issuedShares: latestShare.NumberOfSharesIssued,
          ratio: latestShare.ForeignInvestmentSharesRatio,
          remainRatio: latestShare.ForeignInvestmentRemainRatio,
        }
      : null;

    return NextResponse.json({ institutions, margin, foreignHolding });
  } catch (err) {
    const status = err instanceof FinMindError ? err.status : 500;
    const message = err instanceof Error ? err.message : "讀取籌碼失敗";
    return NextResponse.json({ error: message }, { status });
  }
}
