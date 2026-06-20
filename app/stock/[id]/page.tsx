"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PriceSection } from "@/components/PriceSection";
import { ValuationPanel } from "@/components/ValuationPanel";
import { ChipsPanel } from "@/components/ChipsPanel";
import { FinancialsPanel } from "@/components/FinancialsPanel";
import { DividendsPanel } from "@/components/DividendsPanel";
import { MonthRevenuePanel } from "@/components/MonthRevenuePanel";

export default function StockPage() {
  const params = useParams();
  const stockId = String(params.id ?? "");

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-100"
        >
          ← 返回自選股
        </Link>
      </header>

      <PriceSection stockId={stockId} />

      <div className="mt-4">
        <ValuationPanel stockId={stockId} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChipsPanel stockId={stockId} />
        <FinancialsPanel stockId={stockId} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MonthRevenuePanel stockId={stockId} />
        <DividendsPanel stockId={stockId} />
      </div>

      <footer className="mt-8 text-center text-xs text-neutral-600">
        資料來源：FinMind。僅供研究參考，不構成投資建議。
      </footer>
    </main>
  );
}
