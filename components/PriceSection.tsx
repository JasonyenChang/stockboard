"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Candle, Quote, StockMeta, RealtimeQuote } from "@/lib/types";
import { marketOpen, todayStr } from "@/lib/market";
import { CandleChart } from "./CandleChart";
import { QuoteHeader } from "./QuoteHeader";
import { Panel, Spinner, ErrorBox } from "./Panel";

interface PriceData {
  meta: StockMeta | null;
  candles: Candle[];
  quote: Quote;
}

const RANGES = [
  { label: "3個月", days: 90 },
  { label: "6個月", days: 180 },
  { label: "1年", days: 365 },
  { label: "3年", days: 365 * 3 },
];

const pick = (rt: number, fallback: number) =>
  Number.isFinite(rt) ? rt : fallback;

export function PriceSection({ stockId }: { stockId: string }) {
  const [days, setDays] = useState(365);
  const { data, error, isLoading } = useSWR<PriceData>(
    `/api/price?id=${stockId}&days=${days}`,
    fetcher,
    { keepPreviousData: true }
  );

  // Intraday quote: fetch once always (fresher than EOD just after close),
  // and poll every 15s while the market is open.
  const { data: rtData } = useSWR<{ quote: RealtimeQuote | null }>(
    `/api/realtime?id=${stockId}`,
    fetcher,
    {
      refreshInterval: marketOpen() ? 15000 : 0,
      keepPreviousData: false,
    }
  );

  const rt = rtData?.quote ?? null;
  const isLive = !!rt && marketOpen() && rt.date === todayStr();

  // Overlay the real-time numbers on top of the daily quote when available.
  const quote: Quote | undefined =
    data && rt
      ? {
          ...data.quote,
          date: rt.date,
          close: rt.price,
          change: rt.change,
          changePct: rt.changePct,
          open: pick(rt.open, data.quote.open),
          high: pick(rt.high, data.quote.high),
          low: pick(rt.low, data.quote.low),
          volume: pick(rt.volume, data.quote.volume),
        }
      : data?.quote;

  return (
    <div className="space-y-4">
      {error && <ErrorBox message={(error as Error).message} />}
      {data && quote && (
        <QuoteHeader
          meta={data.meta}
          quote={quote}
          stockId={stockId}
          isLive={isLive}
          quoteTime={rt?.time}
        />
      )}
      <Panel
        title="K 線圖"
        right={
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`rounded px-2 py-1 text-xs ${
                  days === r.days
                    ? "bg-blue-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      >
        {isLoading && !data && <Spinner label="載入 K 線…" />}
        {data && data.candles.length > 0 ? (
          <CandleChart candles={data.candles} />
        ) : (
          !isLoading && <p className="text-sm text-neutral-400">無價格資料。</p>
        )}
      </Panel>
    </div>
  );
}
