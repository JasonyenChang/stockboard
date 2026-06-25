import { NextResponse } from "next/server";
import type { Candle } from "@/lib/types";

// TAIEX (發行量加權股價指數) daily OHLC. We use Yahoo Finance's chart API for
// ^TWII because it works reliably from datacenter IPs (TWSE's own open-data
// endpoint blocks them, which broke the chart on Vercel). The index has no
// meaningful per-bar volume here, so volume is 0.
const YAHOO_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/%5ETWII?range=1y&interval=1d";

interface YahooChart {
  chart: {
    result?: {
      timestamp?: number[];
      meta?: { gmtoffset?: number };
      indicators: {
        quote: {
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
        }[];
      };
    }[];
    error?: unknown;
  };
}

export async function GET() {
  try {
    const res = await fetch(YAHOO_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 * 60 }, // 1h
    });
    if (!res.ok) {
      return NextResponse.json({ candles: [] });
    }

    const json = (await res.json()) as YahooChart;
    const r = json.chart.result?.[0];
    const ts = r?.timestamp;
    const q = r?.indicators?.quote?.[0];
    if (!r || !ts || !q) return NextResponse.json({ candles: [] });

    const offset = r.meta?.gmtoffset ?? 8 * 3600; // TW is UTC+8

    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const open = q.open[i];
      const high = q.high[i];
      const low = q.low[i];
      const close = q.close[i];
      if (open == null || high == null || low == null || close == null) continue;
      const date = new Date((ts[i] + offset) * 1000).toISOString().slice(0, 10);
      candles.push({ date, open, high, low, close, volume: 0 });
    }

    return NextResponse.json({ candles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取大盤失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
