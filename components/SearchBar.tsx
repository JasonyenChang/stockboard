"use client";

import { useEffect, useRef, useState } from "react";
import type { StockMeta } from "@/lib/types";

export function SearchBar({
  onSelect,
}: {
  onSelect: (stockId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockMeta[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        setResults(json.results ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        /* aborted */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(s: StockMeta) {
    onSelect(s.stockId);
    setQuery(`${s.stockId} ${s.stockName}`);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        onSelect(query.trim().split(/\s+/)[0]);
        setOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="輸入股票代號或名稱，例如 2330 或 台積電"
        className="w-full rounded-lg border border-panelborder bg-panel px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-panelborder bg-panel shadow-xl scroll-thin">
          {results.map((s, i) => (
            <li key={s.stockId}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                  i === active ? "bg-blue-600/20" : ""
                }`}
              >
                <span>
                  <span className="font-mono text-neutral-100">
                    {s.stockId}
                  </span>{" "}
                  <span className="text-neutral-300">{s.stockName}</span>
                </span>
                <span className="text-xs text-neutral-400">{s.industry}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
