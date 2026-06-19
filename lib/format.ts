// Display formatting helpers (Taiwan locale conventions).

export function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("zh-TW", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("zh-TW");
}

// Large monetary values → 億 / 萬 units.
export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)} 億`;
  if (abs >= 1e4) return `${(n / 1e4).toFixed(2)} 萬`;
  return fmtInt(n);
}

// Shares → 張 (1 張 = 1000 shares), shown with sign.
export function fmtLots(shares: number | null | undefined): string {
  if (shares === null || shares === undefined || Number.isNaN(shares)) return "—";
  const lots = shares / 1000;
  const sign = lots > 0 ? "+" : "";
  return `${sign}${Math.round(lots).toLocaleString("zh-TW")}`;
}

export function signClass(n: number): string {
  if (n > 0) return "text-up";
  if (n < 0) return "text-down";
  return "text-neutral-300";
}
