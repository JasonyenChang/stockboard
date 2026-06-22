import { NextRequest, NextResponse } from "next/server";
import type { RealtimeQuote } from "@/lib/types";

// TWSE MIS near-real-time quote endpoint (delayed ~5-20s during trading).
// Undocumented/unofficial; may rate-limit or block datacenter IPs.
const MIS_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp";

interface MisStock {
  c: string; // stock id
  z: string; // 最新成交價 ("-" when no trade this tick)
  y: string; // 昨收
  o: string; // 開盤
  h: string; // 最高
  l: string; // 最低
  v: string; // 累積成交量 (張)
  t: string; // 時間 HH:mm:ss
  d: string; // 日期 YYYYMMDD
  a?: string; // 賣出五檔, "_"-separated
  b?: string; // 買進五檔, "_"-separated
}

function num(s: string | undefined): number {
  if (!s || s === "-") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function firstOf(list: string | undefined): number {
  if (!list) return NaN;
  return num(list.split("_")[0]);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "缺少股票代號" }, { status: 400 });

  try {
    // Query both listed (tse) and OTC (otc) channels; only the valid one returns.
    const ex = `tse_${id}.tw|otc_${id}.tw`;
    const url = `${MIS_URL}?ex_ch=${encodeURIComponent(ex)}&json=1&delay=0`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://mis.twse.com.tw/stock/index.jsp",
        Accept: "application/json",
      },
      next: { revalidate: 10 },
    });

    if (!res.ok) {
      return NextResponse.json({ quote: null });
    }

    const json = (await res.json()) as { msgArray?: MisStock[] };
    const s = json.msgArray?.find((m) => m.c === id) ?? json.msgArray?.[0];
    if (!s) return NextResponse.json({ quote: null });

    const prevClose = num(s.y);
    // Latest price: last trade, else best bid, else best ask, else prev close.
    let price = num(s.z);
    if (Number.isNaN(price)) price = firstOf(s.b);
    if (Number.isNaN(price)) price = firstOf(s.a);
    if (Number.isNaN(price)) price = prevClose;

    if (Number.isNaN(price) || Number.isNaN(prevClose)) {
      return NextResponse.json({ quote: null });
    }

    const change = price - prevClose;
    const d = s.d ?? "";
    const date =
      d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;

    const quote: RealtimeQuote = {
      price,
      prevClose,
      change,
      changePct: prevClose ? (change / prevClose) * 100 : 0,
      open: num(s.o),
      high: num(s.h),
      low: num(s.l),
      volume: num(s.v) * 1000, // 張 → 股數 (match daily Quote convention)
      time: s.t ?? "",
      date,
    };

    return NextResponse.json({ quote });
  } catch {
    return NextResponse.json({ quote: null });
  }
}
