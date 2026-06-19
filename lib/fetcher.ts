// SWR fetcher that surfaces API error messages.
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `請求失敗 (${res.status})`);
  }
  return json as T;
}
