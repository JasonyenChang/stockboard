// Server-side stock list cache for search/autocomplete and name lookup.
import { finmindFetch } from "./finmind";
import type { StockMeta } from "./types";

interface RawStockInfo {
  industry_category: string;
  stock_id: string;
  stock_name: string;
  type: string;
  date: string;
}

let cache: StockMeta[] | null = null;
let cachedAt = 0;
const TTL = 1000 * 60 * 60 * 24; // 24h

async function loadStocks(): Promise<StockMeta[]> {
  if (cache && Date.now() - cachedAt < TTL) return cache;

  const rows = await finmindFetch<RawStockInfo>(
    { dataset: "TaiwanStockInfo" },
    60 * 60 * 24
  );

  const seen = new Set<string>();
  const list: StockMeta[] = [];
  for (const r of rows) {
    // Keep only ordinary stocks (4-digit ids); skip warrants/ETN duplicates.
    if (seen.has(r.stock_id)) continue;
    seen.add(r.stock_id);
    list.push({
      stockId: r.stock_id,
      stockName: r.stock_name,
      industry: r.industry_category,
      type: r.type,
    });
  }
  cache = list;
  cachedAt = Date.now();
  return list;
}

export async function searchStocks(query: string, limit = 12): Promise<StockMeta[]> {
  const all = await loadStocks();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const exact = all.filter((s) => s.stockId === q);
  const idPrefix = all.filter(
    (s) => s.stockId.startsWith(q) && s.stockId !== q
  );
  const nameMatch = all.filter(
    (s) => !s.stockId.startsWith(q) && s.stockName.toLowerCase().includes(q)
  );
  return [...exact, ...idPrefix, ...nameMatch].slice(0, limit);
}

export async function getStockMeta(stockId: string): Promise<StockMeta | null> {
  const all = await loadStocks();
  return all.find((s) => s.stockId === stockId) ?? null;
}
