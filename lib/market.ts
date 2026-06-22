// TW market-session helpers (client-side, using the browser's local time —
// assumes the user is in the Taiwan timezone).

// Mon–Fri 09:00–13:35 (buffer past the 13:30 close).
export function marketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const hm = now.getHours() * 60 + now.getMinutes();
  return hm >= 9 * 60 && hm <= 13 * 60 + 35;
}

export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
