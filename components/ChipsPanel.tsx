"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { InstitutionPoint, MarginPoint, ForeignHolding } from "@/lib/types";
import { fmtLots, fmtInt, fmtNum, signClass } from "@/lib/format";
import { Panel, Spinner, ErrorBox } from "./Panel";

interface ChipsData {
  institutions: InstitutionPoint[];
  margin: MarginPoint[];
  foreignHoldings: ForeignHolding[];
}

export function ChipsPanel({ stockId }: { stockId: string }) {
  const { data, error, isLoading } = useSWR<ChipsData>(
    `/api/chips?id=${stockId}&days=90`,
    fetcher
  );

  return (
    <Panel title="籌碼面 — 三大法人 / 融資融券">
      {isLoading && <Spinner />}
      {error && <ErrorBox message={(error as Error).message} />}
      {data && (
        <ChipsContent
          institutions={data.institutions}
          margin={data.margin}
          foreignHoldings={data.foreignHoldings}
        />
      )}
    </Panel>
  );
}

function ChipsContent({
  institutions,
  margin,
  foreignHoldings,
}: {
  institutions: InstitutionPoint[];
  margin: MarginPoint[];
  foreignHoldings: ForeignHolding[];
}) {
  const recent = institutions.slice(-20).reverse();

  if (recent.length === 0) {
    return <p className="text-sm text-neutral-400">此股票無籌碼資料。</p>;
  }

  // sums over the shown window
  const sum = recent.reduce(
    (a, p) => ({
      foreign: a.foreign + p.foreign,
      trust: a.trust + p.trust,
      dealer: a.dealer + p.dealer,
    }),
    { foreign: 0, trust: 0, dealer: 0 }
  );

  const latestMargin = margin.length ? margin[margin.length - 1] : null;

  return (
    <div className="space-y-5">
      {foreignHoldings.length > 0 && (
        <div className="rounded-lg border border-panelborder bg-neutral-900/40 p-3">
          <div className="mb-1 text-xs text-neutral-400">
            外資持股（近 5 日）
            {/* Only 外資 has holding/ratio data from FinMind; 投信/自營商
                total holdings aren't available, so they're omitted. */}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-neutral-400">
                <th className="py-1 text-left font-normal">日期</th>
                <th className="py-1 text-right font-normal">持有張數</th>
                <th className="py-1 text-right font-normal">持股比率</th>
              </tr>
            </thead>
            <tbody>
              {foreignHoldings.map((h) => (
                <tr key={h.date} className="border-t border-panelborder/60">
                  <td className="py-1.5 text-neutral-400">{h.date}</td>
                  <td className="py-1.5 text-right font-mono text-neutral-200">
                    {fmtInt(h.shares / 1000)}
                  </td>
                  <td className="py-1.5 text-right font-mono text-neutral-200">
                    {fmtNum(h.ratio)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "外資", v: sum.foreign },
          { label: "投信", v: sum.trust },
          { label: "自營商", v: sum.dealer },
        ].map((b) => (
          <div
            key={b.label}
            className="rounded-lg border border-panelborder bg-neutral-900/40 p-3 text-center"
          >
            <div className="text-xs text-neutral-400">{b.label} 近20日淨買(張)</div>
            <div className={`text-lg font-semibold ${signClass(b.v)}`}>
              {fmtLots(b.v)}
            </div>
          </div>
        ))}
      </div>

      {latestMargin && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-panelborder bg-neutral-900/40 p-3">
            <span className="text-neutral-400">融資餘額(張)：</span>
            <span className="font-medium text-neutral-200">
              {fmtInt(latestMargin.marginBalance)}
            </span>
          </div>
          <div className="rounded-lg border border-panelborder bg-neutral-900/40 p-3">
            <span className="text-neutral-400">融券餘額(張)：</span>
            <span className="font-medium text-neutral-200">
              {fmtInt(latestMargin.shortBalance)}
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-400">
              <th className="py-1.5 pr-3 font-normal">日期</th>
              <th className="py-1.5 pr-3 text-right font-normal">外資</th>
              <th className="py-1.5 pr-3 text-right font-normal">投信</th>
              <th className="py-1.5 pr-3 text-right font-normal">自營商</th>
              <th className="py-1.5 pr-3 text-right font-normal">成交張</th>
              <th className="py-1.5 pl-3 text-right font-normal">當沖%</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.date} className="border-t border-panelborder/60">
                <td className="py-1.5 pr-3 text-neutral-400">{p.date}</td>
                <td className={`py-1.5 pr-3 text-right ${signClass(p.foreign)}`}>
                  {fmtLots(p.foreign)}
                </td>
                <td className={`py-1.5 pr-3 text-right ${signClass(p.trust)}`}>
                  {fmtLots(p.trust)}
                </td>
                <td className={`py-1.5 pr-3 text-right ${signClass(p.dealer)}`}>
                  {fmtLots(p.dealer)}
                </td>
                <td className="py-1.5 pr-3 text-right text-neutral-300">
                  {Number.isNaN(p.volume) ? "—" : fmtInt(p.volume / 1000)}
                </td>
                <td className="py-1.5 pl-3 text-right text-neutral-300">
                  {Number.isNaN(p.dayTradeRatio)
                    ? "—"
                    : `${fmtNum(p.dayTradeRatio, 1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
