import { NextResponse } from "next/server";
import type { Candle } from "@/lib/types";

// TAIEX (發行量加權股價指數) daily OHLC from the TWSE open data endpoint.
// Returns one month per request, so we fetch the last several months. The
// index has no per-day volume, so volume is 0. Caveat: like MIS, TWSE may
// block datacenter IPs (watch on Vercel).
const TWSE_URL = "https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST";

interface TwseResp {
  stat: string;
  data?: string[][]; // [民國日期, 開, 高, 低, 收] with comma separators
}

function rocToISO(s: string): string {
  const [y, m, d] = s.split("/");
  return `${Number(y) + 1911}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function n(s: string): number {
  return Number(String(s).replace(/,/g, ""));
}

export async function GET() {
  try {
    const now = new Date();
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}01`
      );
    }

    const results = await Promise.all(
      months.map((ym) =>
        fetch(`${TWSE_URL}?date=${ym}&response=json`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 60 * 60 }, // 1h
        })
          .then((r) => (r.ok ? (r.json() as Promise<TwseResp>) : null))
          .catch(() => null)
      )
    );

    const byDate = new Map<string, Candle>();
    for (const res of results) {
      if (!res || res.stat !== "OK" || !res.data) continue;
      for (const row of res.data) {
        const [date, open, high, low, close] = row;
        const iso = rocToISO(date);
        byDate.set(iso, {
          date: iso,
          open: n(open),
          high: n(high),
          low: n(low),
          close: n(close),
          volume: 0,
        });
      }
    }

    const candles = Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({ candles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取大盤失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
