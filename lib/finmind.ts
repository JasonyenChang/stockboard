// FinMind API v4 client — server-side only.
// Docs: https://finmindtrade.com/analysis/#/data/api
// A free token (env FINMIND_TOKEN) raises the rate limit considerably.
// Without a token the public endpoint still works but is heavily throttled.

const BASE_URL = "https://api.finmindtrade.com/api/v4/data";

export interface FinMindResponse<T> {
  msg: string;
  status: number;
  data: T[];
}

interface FetchParams {
  dataset: string;
  data_id?: string;
  start_date?: string;
  end_date?: string;
}

export async function finmindFetch<T = Record<string, unknown>>(
  params: FetchParams,
  revalidate = 60 * 30 // cache 30 min by default
): Promise<T[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("dataset", params.dataset);
  if (params.data_id) url.searchParams.set("data_id", params.data_id);
  if (params.start_date) url.searchParams.set("start_date", params.start_date);
  if (params.end_date) url.searchParams.set("end_date", params.end_date);

  const token = process.env.FINMIND_TOKEN;
  if (token) url.searchParams.set("token", token);

  const res = await fetch(url.toString(), {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    if (res.status === 402) {
      throw new FinMindError(
        "FinMind 流量已達上限，請設定 FINMIND_TOKEN 或稍後再試。",
        402
      );
    }
    throw new FinMindError(`FinMind 請求失敗 (HTTP ${res.status})`, res.status);
  }

  const json = (await res.json()) as FinMindResponse<T>;
  if (json.status !== 200) {
    throw new FinMindError(json.msg || "FinMind 回傳錯誤", json.status);
  }
  return json.data ?? [];
}

export class FinMindError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FinMindError";
    this.status = status;
  }
}

// ---- date helpers ---------------------------------------------------------

export function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
