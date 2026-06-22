"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Quote, StockMeta, RealtimeQuote } from "@/lib/types";
import { fmtNum, signClass } from "@/lib/format";
import { marketOpen, todayStr } from "@/lib/market";

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

  // Intraday quote: poll every 15s while the market is open.
  const { data: rtData } = useSWR<{ quote: RealtimeQuote | null }>(
    `/api/realtime?id=${stockId}`,
    fetcher,
    { refreshInterval: marketOpen() ? 15000 : 0 }
  );

  const dq = data?.quote;
  const rt = rtData?.quote ?? null;
  const isLive = !!rt && marketOpen() && rt.date === todayStr();

  // Prefer the real-time numbers when available, else the EOD quote.
  const price = rt ? rt.price : dq?.close;
  const change = rt ? rt.change : dq?.change;
  const changePct = rt ? rt.changePct : dq?.changePct;
  const has = price != null && change != null && changePct != null;

  const arrow = !has ? "" : change! > 0 ? "▲" : change! < 0 ? "▼" : "";
  const color = has ? signClass(change!) : "text-neutral-300";

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
          <span className="flex items-center gap-1.5 truncate">
            {isLive && (
              <span
                className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
                title="盤中即時"
              />
            )}
            <span className="truncate text-lg font-bold text-neutral-100">
              {data?.meta?.stockName ?? stockId}
            </span>
          </span>
          <span className="font-mono text-sm text-neutral-500">{stockId}</span>
        </div>

        <div className="flex flex-col items-center gap-1 px-4 py-5">
          {isLoading && !has && (
            <span className="py-3 text-sm text-neutral-500">載入中…</span>
          )}
          {error && !has && (
            <span className="py-3 text-sm text-down">讀取失敗</span>
          )}
          {has && (
            <>
              <span className={`text-4xl font-bold tabular-nums ${color}`}>
                {fmtNum(price!)}
              </span>
              <span
                className={`flex items-baseline gap-3 text-base font-medium tabular-nums ${color}`}
              >
                <span>
                  {arrow} {fmtNum(Math.abs(change!))}
                </span>
                <span>{fmtNum(Math.abs(changePct!))}%</span>
              </span>
            </>
          )}
        </div>
      </Link>
    </div>
  );
}
