"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { RevenuePoint } from "@/lib/types";
import { fmtMoney, fmtNum, signClass } from "@/lib/format";
import { Panel, Spinner, ErrorBox } from "./Panel";

interface RevenueData {
  revenue: RevenuePoint[];
}

export function MonthRevenuePanel({ stockId }: { stockId: string }) {
  const { data, error, isLoading } = useSWR<RevenueData>(
    `/api/revenue?id=${stockId}`,
    fetcher
  );

  return (
    <Panel title="月營收 (近 12 月)">
      {isLoading && <Spinner />}
      {error && <ErrorBox message={(error as Error).message} />}
      {data &&
        (data.revenue.length === 0 ? (
          <p className="text-sm text-neutral-400">此股票無月營收資料。</p>
        ) : (
          <RevenueContent revenue={data.revenue} />
        ))}
    </Panel>
  );
}

function RevenueContent({ revenue }: { revenue: RevenuePoint[] }) {
  const maxRev = Math.max(1, ...revenue.map((r) => r.revenue || 0));

  return (
    <div className="space-y-4">
      {/* monthly revenue bars, oldest → newest */}
      <div className="flex items-end justify-between gap-1.5 pt-2">
        {revenue.map((r) => (
          <div
            key={`${r.year}-${r.month}`}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className="w-full max-w-[18px] rounded-t bg-blue-500/70"
                style={{ height: `${((r.revenue || 0) / maxRev) * 100}%` }}
                title={fmtMoney(r.revenue)}
              />
            </div>
            <span className="text-[10px] text-neutral-500">{r.month}月</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-neutral-400">
              <th className="py-1.5 pr-3 text-left font-normal">月份</th>
              <th className="py-1.5 pr-3 text-right font-normal">營收</th>
              <th className="py-1.5 text-right font-normal">年增率 (YoY)</th>
            </tr>
          </thead>
          <tbody>
            {[...revenue].reverse().map((r) => (
              <tr
                key={`${r.year}-${r.month}`}
                className="border-t border-panelborder/60"
              >
                <td className="py-1.5 pr-3 text-neutral-300">
                  {r.year}/{String(r.month).padStart(2, "0")}
                </td>
                <td className="py-1.5 pr-3 text-right font-mono text-neutral-200">
                  {fmtMoney(r.revenue)}
                </td>
                <td
                  className={`py-1.5 text-right font-mono ${
                    r.yoy == null ? "text-neutral-500" : signClass(r.yoy)
                  }`}
                >
                  {r.yoy == null
                    ? "—"
                    : `${r.yoy > 0 ? "+" : ""}${fmtNum(r.yoy, 1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
