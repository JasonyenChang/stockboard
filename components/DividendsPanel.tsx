"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { DividendYear } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { Panel, Spinner, ErrorBox } from "./Panel";

interface DividendData {
  dividends: DividendYear[];
}

export function DividendsPanel({ stockId }: { stockId: string }) {
  const { data, error, isLoading } = useSWR<DividendData>(
    `/api/dividends?id=${stockId}`,
    fetcher
  );

  return (
    <Panel title="近五年股利 (元/股，依除息年度)">
      {isLoading && <Spinner />}
      {error && <ErrorBox message={(error as Error).message} />}
      {data &&
        (data.dividends.length === 0 ? (
          <p className="text-sm text-neutral-400">此股票無股利資料。</p>
        ) : (
          <DividendContent dividends={data.dividends} />
        ))}
    </Panel>
  );
}

function DividendContent({ dividends }: { dividends: DividendYear[] }) {
  const maxTotal = Math.max(1, ...dividends.map((d) => d.total));
  // newest year first in the table
  const rows = dividends;

  return (
    <div className="space-y-4">
      {/* bar chart, oldest → newest left to right */}
      <div className="flex items-end justify-between gap-2 px-1 pt-2">
        {[...rows].reverse().map((d) => (
          <div key={d.year} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs text-neutral-300">
              {fmtNum(d.total)}
            </span>
            <div className="flex h-24 w-full items-end justify-center">
              <div
                className="w-6 rounded-t bg-up"
                style={{ height: `${(d.total / maxTotal) * 100}%` }}
                title={`現金 ${fmtNum(d.cash)} / 股票 ${fmtNum(d.stock)}`}
              />
            </div>
            <span className="text-xs text-neutral-400">{d.year}</span>
          </div>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-neutral-400">
            <th className="py-1.5 pr-3 text-left font-normal">除息年度</th>
            <th className="py-1.5 pr-3 text-right font-normal">現金股利</th>
            <th className="py-1.5 pr-3 text-right font-normal">股票股利</th>
            <th className="py-1.5 text-right font-normal">合計</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.year} className="border-t border-panelborder/60">
              <td className="py-1.5 pr-3 text-neutral-300">{d.year}</td>
              <td className="py-1.5 pr-3 text-right font-mono text-neutral-200">
                {fmtNum(d.cash)}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-neutral-200">
                {d.stock > 0 ? fmtNum(d.stock) : "—"}
              </td>
              <td className="py-1.5 text-right font-mono font-medium text-neutral-100">
                {fmtNum(d.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
