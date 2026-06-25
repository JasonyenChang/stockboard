"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Candle, RealtimeQuote } from "@/lib/types";
import { fmtNum, signClass } from "@/lib/format";
import { marketOpen, todayStr } from "@/lib/market";
import { CandleChart } from "./CandleChart";
import { Panel, Spinner, ErrorBox } from "./Panel";

const pick = (rt: number, fallback: number) =>
  Number.isFinite(rt) ? rt : fallback;

export function MarketIndexChart() {
  const { data, error, isLoading } = useSWR<{ candles: Candle[] }>(
    "/api/index",
    fetcher
  );

  // Real-time TAIEX via the MIS index channel (t00) — reuses /api/realtime.
  const { data: rtData } = useSWR<{ quote: RealtimeQuote | null }>(
    "/api/realtime?id=t00",
    fetcher,
    { refreshInterval: marketOpen() ? 15000 : 0 }
  );

  const candles = data?.candles ?? [];
  const rt = rtData?.quote ?? null;
  const isLive = !!rt && marketOpen() && rt.date === todayStr();

  const lastCandle = candles[candles.length - 1];
  // Always drive today's bar from MIS (Yahoo's same-day bar can lag);
  // CandleChart.update() replaces today's bar if Yahoo already included it.
  const liveCandle: Candle | null =
    rt && rt.date === todayStr()
      ? {
          date: rt.date,
          open: pick(rt.open, rt.price),
          high: pick(rt.high, rt.price),
          low: pick(rt.low, rt.price),
          close: rt.price,
          volume: 0,
        }
      : null;

  // Header value: live quote if available, else the latest daily close.
  const value = rt?.price ?? lastCandle?.close;
  const change = rt
    ? rt.change
    : lastCandle && candles.length > 1
      ? lastCandle.close - candles[candles.length - 2].close
      : 0;
  const changePct = rt
    ? rt.changePct
    : lastCandle && candles.length > 1 && candles[candles.length - 2].close
      ? (change / candles[candles.length - 2].close) * 100
      : 0;
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "";

  return (
    <Panel
      title="加權指數"
      right={
        value != null ? (
          <div className="flex items-baseline gap-2 text-sm">
            {isLive && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            )}
            <span className={`text-lg font-bold ${signClass(change)}`}>
              {fmtNum(value)}
            </span>
            <span className={`font-medium ${signClass(change)}`}>
              {arrow} {fmtNum(Math.abs(change))} ({fmtNum(Math.abs(changePct))}%)
            </span>
          </div>
        ) : undefined
      }
    >
      {isLoading && <Spinner label="載入大盤…" />}
      {error && <ErrorBox message={(error as Error).message} />}
      {candles.length > 0 && (
        <CandleChart
          candles={candles}
          liveCandle={liveCandle}
          showVolume={false}
          heightClass="h-[260px]"
        />
      )}
    </Panel>
  );
}
