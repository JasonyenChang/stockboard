import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockBoard — 台股看板",
  description: "輸入台股代號，查看 K 線、籌碼、財報與基本資訊",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
