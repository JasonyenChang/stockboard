# StockBoard 台股看板

輸入台股股票代號（或名稱），顯示 **K 線圖、籌碼面、財報與基本報價**。

## 技術

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- [lightweight-charts](https://github.com/tradingview/lightweight-charts)（K 線 / 均線 / 成交量）
- 資料來源：[FinMind](https://finmindtrade.com/) v4 API（透過 Next.js API route 在伺服器端代理，token 不外洩）

## 功能

| 面向 | 內容 |
| --- | --- |
| 報價 | 收盤價、漲跌、開高低、成交量、本益比、淨值比、殖利率 |
| K 線 | 日 K 蠟燭圖、MA5/20/60、成交量，可切換 3 月 / 6 月 / 1 年 / 3 年 |
| 籌碼 | 三大法人（外資 / 投信 / 自營商）每日淨買賣、融資融券餘額 |
| 財報 | 損益表近 8 季（營收、毛利、營業利益、稅前/稅後淨利、EPS） |

> 顏色採台股慣例：**紅漲綠跌**。

## 開始

```bash
nvm use            # Node 22
cp .env.local.example .env.local   # 填入 FinMind token（建議）
npm install
npm run dev        # http://localhost:3000
```

### FinMind Token

未設定 token 時，公開端點會被嚴格限流，可能回傳 HTTP 402。
請至 https://finmindtrade.com 免費註冊，把 token 填入 `.env.local` 的 `FINMIND_TOKEN`。

## 結構

```
app/
  api/
    search/route.ts       股票代號 / 名稱搜尋（伺服器端快取股票清單）
    price/route.ts        日 K + 報價 + 本益比
    chips/route.ts        三大法人 + 融資融券
    financials/route.ts   損益表
  page.tsx                主頁（搜尋 + 各面板）
components/                UI 元件（圖表、面板、搜尋）
lib/                       FinMind client、型別、格式化
```

僅供研究參考，不構成投資建議。
