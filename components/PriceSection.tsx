"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Candle, Quote, StockMeta } from "@/lib/types";
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

export function PriceSection({ stockId }: { stockId: string }) {
  const [days, setDays] = useState(365);
  const { data, error, isLoading } = useSWR<PriceData>(
    `/api/price?id=${stockId}&days=${days}`,
    fetcher,
    { keepPreviousData: true }
  );

  return (
    <div className="space-y-4">
      {error && <ErrorBox message={(error as Error).message} />}
      {data && (
        <QuoteHeader meta={data.meta} quote={data.quote} stockId={stockId} />
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
          !isLoading && (
            <p className="text-sm text-neutral-400">無價格資料。</p>
          )
        )}
      </Panel>
    </div>
  );
}
