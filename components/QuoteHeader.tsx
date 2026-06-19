"use client";

import type { Quote, StockMeta } from "@/lib/types";
import { fmtNum, fmtMoney, signClass } from "@/lib/format";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-sm font-medium text-neutral-200">{value}</div>
    </div>
  );
}

// External reference sites that aren't covered by our own data (e.g. ETF
// holdings). Each builds its URL from the stock id and opens in a new tab.
function ExternalLinks({ stockId }: { stockId: string }) {
  const links = [
    {
      label: "ETF 持股",
      href: `https://www.findbillion.com/twstock/${stockId}/etf`,
    },
    {
      label: "大戶持股",
      href: `https://norway.twsthr.info/StockHolders.aspx?stock=${stockId}`,
    },
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded border border-panelborder px-2 py-1 text-xs text-neutral-300 hover:border-blue-500 hover:text-blue-400"
        >
          {l.label}
          <span aria-hidden>↗</span>
        </a>
      ))}
    </div>
  );
}

export function QuoteHeader({
  meta,
  quote,
  stockId,
}: {
  meta: StockMeta | null;
  quote: Quote;
  stockId: string;
}) {
  const arrow = quote.change > 0 ? "▲" : quote.change < 0 ? "▼" : "";
  return (
    <div className="rounded-xl border border-panelborder bg-panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-neutral-50">
              {meta?.stockName ?? stockId}
            </h1>
            <span className="font-mono text-lg text-neutral-400">
              {stockId}
            </span>
            {meta?.industry && (
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                {meta.industry}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className={`text-3xl font-bold ${signClass(quote.change)}`}>
              {fmtNum(quote.close)}
            </span>
            <span className={`text-lg font-medium ${signClass(quote.change)}`}>
              {arrow} {fmtNum(Math.abs(quote.change))} (
              {fmtNum(Math.abs(quote.changePct))}%)
            </span>
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            收盤日 {quote.date}
          </div>
          <ExternalLinks stockId={stockId} />
        </div>

        <div className="grid grid-cols-3 gap-x-8 gap-y-3 sm:grid-cols-4">
          <Stat label="開盤" value={fmtNum(quote.open)} />
          <Stat label="最高" value={fmtNum(quote.high)} />
          <Stat label="最低" value={fmtNum(quote.low)} />
          <Stat label="成交量(張)" value={fmtMoney(quote.volume / 1000)} />
          <Stat label="本益比" value={quote.per ? fmtNum(quote.per) : "—"} />
          <Stat label="股價淨值比" value={quote.pbr ? fmtNum(quote.pbr) : "—"} />
          <Stat
            label="殖利率"
            value={
              quote.dividendYield ? `${fmtNum(quote.dividendYield)}%` : "—"
            }
          />
        </div>
      </div>
    </div>
  );
}
