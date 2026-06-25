"use client";

import { useEffect, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { StockCard } from "@/components/StockCard";
import { MarketIndexChart } from "@/components/MarketIndexChart";

const STORAGE_KEY = "stockboard:watchlist";
const DEFAULTS = ["2330", "2317", "2454", "2308"];

export default function Home() {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Hydrate the watchlist from localStorage on first mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : null;
      setIds(parsed && parsed.length ? parsed : DEFAULTS);
    } catch {
      setIds(DEFAULTS);
    }
    setLoaded(true);
  }, []);

  // Persist on change (only after initial hydration).
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, loaded]);

  function add(id: string) {
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function remove(id: string) {
    setIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-neutral-50">📈 StockBoard</span>
          <span className="text-sm text-neutral-400">台股看板</span>
        </div>
        <SearchBar onSelect={add} />
        <p className="text-xs text-neutral-500">
          搜尋股票加入自選，點擊卡片查看 K 線、籌碼、財報與股利
        </p>
      </header>

      <div className="mb-6">
        <MarketIndexChart />
      </div>

      {loaded && ids.length === 0 ? (
        <div className="mt-16 text-center text-sm text-neutral-500">
          自選股是空的，用上方搜尋框加入股票吧。
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ids.map((id) => (
            <StockCard key={id} stockId={id} onRemove={remove} />
          ))}
        </div>
      )}
    </main>
  );
}
