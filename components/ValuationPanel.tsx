"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Valuation } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { Panel, Spinner, ErrorBox } from "./Panel";

interface ValuationData {
  valuation: Valuation | null;
}

// Valuation convention (independent of the red-up/green-down price colors):
// cheap = green, fair = amber, expensive = red.
const LABEL_STYLE: Record<Valuation["label"], string> = {
  便宜: "bg-down/20 text-down",
  合理: "bg-amber-500/20 text-amber-400",
  昂貴: "bg-up/20 text-up",
};

export function ValuationPanel({ stockId }: { stockId: string }) {
  const { data, error, isLoading } = useSWR<ValuationData>(
    `/api/valuation?id=${stockId}`,
    fetcher
  );

  return (
    <Panel title="價格評估 (本益比河流圖)">
      {isLoading && <Spinner />}
      {error && <ErrorBox message={(error as Error).message} />}
      {data &&
        (data.valuation === null ? (
          <p className="text-sm text-neutral-400">
            無法估價：缺乏有效本益比（可能為虧損或金融股）。
          </p>
        ) : (
          <ValuationContent v={data.valuation} />
        ))}
    </Panel>
  );
}

function ValuationContent({ v }: { v: Valuation }) {
  // position of current price within the cheap→expensive range (clamped 0–100)
  const span = v.expensive - v.cheap;
  const pos =
    span > 0 ? Math.min(100, Math.max(0, ((v.price - v.cheap) / span) * 100)) : 50;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-400">現價 {fmtNum(v.price)}</span>
        <span
          className={`rounded px-2 py-0.5 text-sm font-semibold ${LABEL_STYLE[v.label]}`}
        >
          {v.label}
        </span>
        <span className="text-xs text-neutral-500">本益比 {fmtNum(v.per)}</span>
      </div>

      {/* position bar: green (cheap) → amber → red (expensive) */}
      <div className="relative pt-1">
        <div className="h-2 w-full rounded-full bg-gradient-to-r from-down via-amber-500 to-up" />
        <div
          className="absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-neutral-900"
          style={{ left: `${pos}%`, top: "0px" }}
          aria-hidden
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "便宜價", value: v.cheap, cls: "text-down" },
          { label: "合理價", value: v.fair, cls: "text-amber-400" },
          { label: "昂貴價", value: v.expensive, cls: "text-up" },
        ].map((b) => (
          <div
            key={b.label}
            className="rounded-lg border border-panelborder bg-neutral-900/40 p-3"
          >
            <div className="text-xs text-neutral-400">{b.label}</div>
            <div className={`text-lg font-semibold ${b.cls}`}>
              {fmtNum(b.value)}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-500">
        依近 {v.years} 年本益比區間（P20／中位／P80）× 近四季 EPS 推估，僅供參考。
      </p>
    </div>
  );
}
