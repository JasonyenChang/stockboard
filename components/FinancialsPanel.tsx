"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { FinancialRow } from "@/lib/types";
import { fmtMoney, fmtNum } from "@/lib/format";
import { Panel, Spinner, ErrorBox } from "./Panel";

interface FinData {
  rows: FinancialRow[];
  dates: string[];
}

type Mode = "quarter" | "cumulative";

// EPS is a per-share figure; everything else is a monetary amount.
function formatValue(key: string, value: number): string {
  if (Number.isNaN(value)) return "—";
  if (key === "EPS") return fmtNum(value);
  return fmtMoney(value);
}

export function FinancialsPanel({ stockId }: { stockId: string }) {
  const [mode, setMode] = useState<Mode>("quarter");
  const { data, error, isLoading } = useSWR<FinData>(
    `/api/financials?id=${stockId}`,
    fetcher
  );

  return (
    <Panel
      title="財報 — 損益表 (近 8 季)"
      right={
        <div className="flex gap-1">
          {(
            [
              { m: "quarter", label: "單季" },
              { m: "cumulative", label: "累計" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.m}
              onClick={() => setMode(opt.m)}
              className={`rounded px-2 py-1 text-xs ${
                mode === opt.m
                  ? "bg-blue-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && <Spinner />}
      {error && <ErrorBox message={(error as Error).message} />}
      {data &&
        (data.rows.length === 0 ? (
          <p className="text-sm text-neutral-400">此股票無財報資料。</p>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-400">
                  <th className="sticky left-0 bg-panel py-2 pr-4 text-left font-normal">
                    項目
                  </th>
                  {data.dates.map((d) => (
                    <th
                      key={d}
                      className="whitespace-nowrap py-2 px-3 text-right font-normal"
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.key} className="border-t border-panelborder/60">
                    <td className="sticky left-0 bg-panel py-2 pr-4 text-left text-neutral-300">
                      {row.label}
                    </td>
                    {row.values.map((v) => (
                      <td
                        key={v.date}
                        className="whitespace-nowrap py-2 px-3 text-right font-mono text-neutral-200"
                      >
                        {formatValue(row.key, v[mode])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </Panel>
  );
}
