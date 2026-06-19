import { NextRequest, NextResponse } from "next/server";
import { finmindFetch, daysAgo, today, FinMindError } from "@/lib/finmind";
import { getStockMeta } from "@/lib/stocks";
import type { Candle, Quote } from "@/lib/types";

interface RawPrice {
  date: string;
  open: number;
  max: number;
  min: number;
  close: number;
  Trading_Volume: number;
}

interface RawPER {
  date: string;
  dividend_yield: number;
  PER: number;
  PBR: number;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  const days = Number(req.nextUrl.searchParams.get("days") ?? "365");
  if (!id) return NextResponse.json({ error: "缺少股票代號" }, { status: 400 });

  try {
    const start = daysAgo(Number.isFinite(days) ? days : 365);
    const [rawPrice, rawPer, meta] = await Promise.all([
      finmindFetch<RawPrice>({
        dataset: "TaiwanStockPrice",
        data_id: id,
        start_date: start,
        end_date: today(),
      }),
      finmindFetch<RawPER>({
        dataset: "TaiwanStockPER",
        data_id: id,
        start_date: daysAgo(10),
        end_date: today(),
      }).catch(() => [] as RawPER[]),
      getStockMeta(id),
    ]);

    if (!rawPrice.length) {
      return NextResponse.json(
        { error: `找不到 ${id} 的價格資料` },
        { status: 404 }
      );
    }

    const candles: Candle[] = rawPrice
      .map((r) => ({
        date: r.date,
        open: r.open,
        high: r.max,
        low: r.min,
        close: r.close,
        volume: r.Trading_Volume,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const change = prev ? last.close - prev.close : 0;
    const lastPer = rawPer.length ? rawPer[rawPer.length - 1] : null;

    const quote: Quote = {
      date: last.date,
      close: last.close,
      change,
      changePct: prev && prev.close ? (change / prev.close) * 100 : 0,
      open: last.open,
      high: last.high,
      low: last.low,
      volume: last.volume,
      per: lastPer && lastPer.PER > 0 ? lastPer.PER : null,
      pbr: lastPer && lastPer.PBR > 0 ? lastPer.PBR : null,
      dividendYield: lastPer ? lastPer.dividend_yield : null,
    };

    return NextResponse.json({ meta, candles, quote });
  } catch (err) {
    const status = err instanceof FinMindError ? err.status : 500;
    const message = err instanceof Error ? err.message : "讀取價格失敗";
    return NextResponse.json({ error: message }, { status });
  }
}
