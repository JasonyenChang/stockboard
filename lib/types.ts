// Shared domain types between API routes and client components.

export interface Candle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // shares
}

export interface StockMeta {
  stockId: string;
  stockName: string;
  industry: string;
  type: string; // twse / tpex
}

export interface Quote {
  date: string;
  close: number;
  change: number; // price change vs previous close
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number; // shares
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
}

// Institutional investors (三大法人) net buy/sell, in shares.
export interface InstitutionPoint {
  date: string;
  foreign: number; // 外資
  trust: number; // 投信
  dealer: number; // 自營商 (合計)
  volume: number; // 當日總成交量 (股數); NaN if unavailable
  dayTradeRatio: number; // 當沖比例 (%); NaN if unavailable
}

// Intraday real-time quote from the TWSE MIS endpoint.
export interface RealtimeQuote {
  price: number; // 最新成交價 (or best bid/ask fallback)
  prevClose: number; // 昨收
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number; // 累積成交量 (股數)
  time: string; // "HH:mm:ss"
  date: string; // "YYYY-MM-DD"
  limit: "up" | "down" | null; // 漲停 / 跌停 / 無
}

// PE-band valuation (本益比河流圖): cheap/fair/expensive prices derived from
// the historical PER distribution times trailing EPS.
export interface Valuation {
  eps: number; // 近四季 EPS (推估, = price / PER)
  cheap: number; // 便宜價
  fair: number; // 合理價
  expensive: number; // 昂貴價
  price: number; // 現價 (收盤)
  per: number; // 現價本益比
  label: "便宜" | "合理" | "昂貴";
  years: number; // PE band 取樣年數
}

// Monthly revenue with year-over-year growth.
export interface RevenuePoint {
  year: number;
  month: number;
  revenue: number; // 當月營收 (元)
  yoy: number | null; // 年增率 (%) vs same month last year
}

// Margin trading (融資融券) balances.
export interface MarginPoint {
  date: string;
  marginBalance: number; // 融資餘額 (張)
  shortBalance: number; // 融券餘額 (張)
}

// Foreign-investor shareholding snapshot (外資持股).
export interface ForeignHolding {
  date: string;
  shares: number; // 外資持有股數
  issuedShares: number; // 發行股數
  ratio: number; // 外資持股比例 (%)
  remainRatio: number; // 尚可投資比例 (%)
}

export interface FinancialPoint {
  date: string;
  quarter: number; // 單季 (raw FinMind value)
  cumulative: number; // 累計 (year-to-date sum within the calendar year)
}

export interface FinancialRow {
  label: string; // 中文項目
  key: string; // origin_name
  values: FinancialPoint[]; // newest-first by quarter
}

// Dividends aggregated by ex-dividend year (除息年度) — matches the convention
// used by wantgoo/most broker sites, NOT the earnings-attribution year.
export interface DividendYear {
  year: number; // 西元除息年度
  cash: number; // 現金股利 (元/股)
  stock: number; // 股票股利 (元/股)
  total: number; // 合計
}
