"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Quote, StockMeta } from "@/lib/types";
import { fmtNum, signClass } from "@/lib/format";

interface PriceData {
  meta: StockMeta | null;
  quote: Quote;
}

export function StockCard({
  stockId,
  onRemove,
}: {
  stockId: string;
  onRemove: (id: string) => void;
}) {
  const { data, error, isLoading } = useSWR<PriceData>(
    `/api/price?id=${stockId}&days=7`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const quote = data?.quote;
  const arrow = !quote ? "" : quote.change > 0 ? "▲" : quote.change < 0 ? "▼" : "";
  const color = quote ? signClass(quote.change) : "text-neutral-300";

  return (
    <div className="group relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          onRemove(stockId);
        }}
        aria-label="移除"
        className="absolute right-2 top-2 z-10 hidden h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 group-hover:flex"
      >
        ✕
      </button>

      <Link
        href={`/stock/${stockId}`}
        className="block overflow-hidden rounded-xl border border-panelborder bg-panel transition-colors hover:border-neutral-600"
      >
        <div className="flex items-center justify-between bg-neutral-900/60 px-4 py-2.5">
          <span className="truncate text-lg font-bold text-neutral-100">
            {data?.meta?.stockName ?? stockId}
          </span>
          <span className="font-mono text-sm text-neutral-500">{stockId}</span>
        </div>

        <div className="flex flex-col items-center gap-1 px-4 py-5">
          {isLoading && (
            <span className="py-3 text-sm text-neutral-500">載入中…</span>
          )}
          {error && (
            <span className="py-3 text-sm text-down">讀取失敗</span>
          )}
          {quote && (
            <>
              <span className={`text-4xl font-bold tabular-nums ${color}`}>
                {fmtNum(quote.close)}
              </span>
              <span
                className={`flex items-baseline gap-3 text-base font-medium tabular-nums ${color}`}
              >
                <span>
                  {arrow} {fmtNum(Math.abs(quote.change))}
                </span>
                <span>{fmtNum(Math.abs(quote.changePct))}%</span>
              </span>
            </>
          )}
        </div>
      </Link>
    </div>
  );
}
