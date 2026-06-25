# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project requires **Node 22**, but the machine's default `node` is v16 (too old for Next.js 14). Always select it first:

```bash
nvm use            # reads .nvmrc → Node 22
npm run dev        # dev server at http://localhost:3000
npm run build      # production build
npm start          # serve production build
npx tsc --noEmit   # typecheck (no test suite exists yet)
```

There is no lint or test setup. Use `npx tsc --noEmit` as the correctness gate before claiming a change works.

## Data source: FinMind

Almost all market data comes from the [FinMind](https://finmindtrade.com/) v4 REST API. The **one exception is intraday/real-time quotes**: FinMind's price dataset is end-of-day only (updates after ~14:30, so during trading hours it returns yesterday's close), and its minute/realtime datasets are paid. So `app/api/realtime/route.ts` proxies the free **TWSE MIS** endpoint (`mis.twse.com.tw/stock/api/getStockInfo.jsp`, ~5-20s delayed) instead. It queries both `tse_<id>.tw|otc_<id>.tw` channels (no need to know the market), and `z` (last price) is `"-"` between matches so it falls back to best bid/ask/prev-close. `PriceSection` polls it every 15s during TW market hours (Mon–Fri 09:00–13:35, client local time) and overlays it on the EOD quote. Caveat: MIS is undocumented and may block datacenter IPs (watch this on Vercel). The **加權指數 (TAIEX) chart** on the home page reuses this realtime route via `/api/realtime?id=t00` (MIS index channel, no volume/limit), with daily OHLC candles from **Yahoo Finance `^TWII`** (`app/api/index/route.ts`). NOTE: TWSE's own `MI_5MINS_HIST` open-data endpoint blocks datacenter IPs and broke the chart on Vercel, so Yahoo's chart API is used instead (works from cloud, one request = ~1y of OHLC). FinMind's index dataset is the 報酬指數 (total-return, ~105k) which doesn't match the ~46k price index, so it's unusable here. FinMind key facts:

- **Server-side only.** All FinMind calls go through `lib/finmind.ts` and are invoked exclusively from `app/api/*/route.ts` handlers. The browser never calls FinMind directly — it hits our own `/api/*` routes. This keeps `FINMIND_TOKEN` (read from env in `finmindFetch`) off the client and centralizes caching via `next: { revalidate }`.
- **Token is optional but matters.** Without `FINMIND_TOKEN` (set in `.env.local`) the public endpoint works but is heavily rate-limited and returns **HTTP 402** under load. `FinMindError` maps 402 to a Chinese user-facing message; API routes propagate `err.status`.
- **Financial statements are single-quarter (單季), not cumulative.** `TaiwanStockFinancialStatements` returns each quarter standalone (verified: summing a year's four quarters equals the annual figure). The financials route derives the YTD 累計 figure itself by summing earlier quarters of the same calendar year, and returns both `quarter` and `cumulative` per period (`FinancialPoint`); the panel toggles between them. This matches goodinfo's 單季 vs 累計(ACC) views respectively.
- Datasets in use: `TaiwanStockPrice`, `TaiwanStockPER`, `TaiwanStockInfo`, `TaiwanStockInstitutionalInvestorsBuySell`, `TaiwanStockMarginPurchaseShortSale`, `TaiwanStockDayTrading` (當沖; 當沖比例 = its `Volume` ÷ `TaiwanStockPrice.Trading_Volume`), `TaiwanStockMonthRevenue` (月營收; period is `revenue_year`/`revenue_month`, NOT the `date` field which is the announce month — YoY compares the same month a year earlier), `TaiwanStockFinancialStatements`, `TaiwanStockShareholding` (外資持股 — foreign-only; trust/dealer total holdings are NOT available from FinMind), `TaiwanStockDividend` (股利政策; the dividends route groups by the **ex-dividend year** from `CashExDividendTradingDate`/`StockExDividendTradingDate`, NOT the `year` field which is the earnings-attribution year — the two differ by ~1 year. Quarterly payers contribute multiple rows per ex year, so amounts are summed).

## Architecture

Next.js 14 App Router. Two routes:
- `app/page.tsx` — the home **watchlist**: a search box plus a grid of `StockCard`s. The list of stock ids lives in `localStorage` (`stockboard:watchlist`, seeded with `DEFAULTS` on first visit); searching adds a card, the ✕ removes one. Each card SWR-fetches `/api/price?id=X&days=7` for its quote and links to the detail page.
- `app/stock/[id]/page.tsx` — the per-stock **detail dashboard**. It reads `stockId` from the route via `useParams()` and passes it to every panel; each panel fetches its own slice independently via SWR, so panels load and error in isolation. The in-page `SearchBar` navigates (`router.push`) to another stock's detail page.

Data flow per panel: **client component → SWR `fetcher` → `/api/<x>` route → `finmindFetch` → FinMind**, then shaped into the domain types in `lib/types.ts` (`Candle`, `Quote`, `InstitutionPoint`, `MarginPoint`, `FinancialRow`) before returning JSON. API routes do the reshaping (e.g. `chips` aggregates the per-investor `name` rows into foreign/trust/dealer buckets via `bucketOf`); components stay presentational.

- `lib/stocks.ts` loads the full `TaiwanStockInfo` list once and caches it in a module-level variable (24h TTL) to serve `/api/search` (id/name autocomplete) and name lookups without re-fetching.
- `lib/finmind.ts` also exposes `daysAgo()` / `today()` date helpers used to build `start_date`/`end_date`; these use the real runtime date, not a fixed one.

## Conventions

- **Taiwan market colors: red = up, green = down** (opposite of US). Defined as Tailwind `up`/`down` colors in `tailwind.config.ts`; use `signClass()` from `lib/format.ts` rather than hardcoding. Note: `signClass()` emits the literal class strings `text-up`/`text-down`, so `tailwind.config.ts` `content` **must** include `./lib/**` — otherwise Tailwind never generates those classes and up/down text silently falls back to default color.
- **lightweight-charts is pinned to v4** (`addCandlestickSeries` / `addLineSeries` / `addHistogramSeries` instance methods). Do **not** use the v5 `addSeries(SeriesDefinition)` API or named series exports (`CandlestickSeries`, etc.) — they don't exist in v4 and will fail at runtime.
- Display formatting (張/億/萬 units, signed numbers, locale) lives in `lib/format.ts`. Note `fmtLots` divides shares by 1000 to get 張.
- Avoid spreading `Map`/`Set` iterators (`[...map.values()]`) — use `Array.from(...)`. The TS config's target triggers TS2802 on iterator spread.
