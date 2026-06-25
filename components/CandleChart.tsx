"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";
import { fmtNum } from "@/lib/format";

interface Legend {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

const UP = "#e02d2d";
const DOWN = "#19a974";
const VOL_UP = "#e02d2d55";
const VOL_DOWN = "#19a97455";

function toTime(date: string): UTCTimestamp {
  return (Date.parse(date) / 1000) as UTCTimestamp;
}

function movingAverage(candles: Candle[], period: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: toTime(candles[i].date), value: sum / period });
    }
  }
  return out;
}

const MA_CONFIG = [
  { period: 5, color: "#f5a623" },
  { period: 20, color: "#4a90e2" },
  { period: 60, color: "#bd10e0" },
];

export function CandleChart({
  candles,
  liveCandle,
  showVolume = true,
  heightClass = "h-[420px]",
}: {
  candles: Candle[];
  liveCandle?: Candle | null;
  showVolume?: boolean;
  heightClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRef = useRef<
    { period: number; series: ISeriesApi<"Line"> }[]
  >([]);
  const histRef = useRef<Candle[]>([]);
  const latestRef = useRef<Candle | null>(null);
  const [legend, setLegend] = useState<Legend | null>(null);

  // Build the chart from the historical (EOD) candles. Rebuilds only when the
  // candle set changes (stock / range switch), not on every live tick.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dateByTime = new Map<number, string>();
    for (const c of candles) dateByTime.set(toTime(c.date), c.date);

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#16181d" },
        textColor: "#9aa0a6",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#23262d" },
        horzLines: { color: "#23262d" },
      },
      rightPriceScale: { borderColor: "#2a2e36" },
      timeScale: { borderColor: "#2a2e36", timeVisible: false },
      crosshair: { mode: 1 },
      autoSize: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: toTime(c.date),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    candleSeriesRef.current = candleSeries;

    maSeriesRef.current = [];
    for (const ma of MA_CONFIG) {
      const line = chart.addLineSeries({
        color: ma.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      line.setData(movingAverage(candles, ma.period));
      maSeriesRef.current.push({ period: ma.period, series: line });
    }

    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(
        candles.map((c, i) => ({
          time: toTime(c.date),
          value: c.volume,
          color: i > 0 && c.close >= candles[i - 1].close ? VOL_UP : VOL_DOWN,
        }))
      );
      volSeriesRef.current = volumeSeries;
    }

    histRef.current = candles;
    const last = candles[candles.length - 1];
    latestRef.current = last ?? null;
    if (last) {
      setLegend({
        date: last.date,
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
      });
    }

    chart.timeScale().fitContent();

    // Update the legend to whichever bar the crosshair is over; fall back to
    // the latest bar (which may be the live one) when not hovering.
    chart.subscribeCrosshairMove((param) => {
      const bar = param.seriesData.get(candleSeries) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      if (!bar || param.time == null) {
        const l = latestRef.current;
        if (l)
          setLegend({
            date: l.date,
            open: l.open,
            high: l.high,
            low: l.low,
            close: l.close,
          });
        return;
      }
      setLegend({
        date: dateByTime.get(param.time as number) ?? "",
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
      maSeriesRef.current = [];
    };
  }, [candles]);

  // Incrementally update just the latest (today's) bar on each live tick,
  // without rebuilding the chart — preserves the user's zoom/pan.
  useEffect(() => {
    const cs = candleSeriesRef.current;
    if (!cs || !liveCandle) return;

    const t = toTime(liveCandle.date);
    cs.update({
      time: t,
      open: liveCandle.open,
      high: liveCandle.high,
      low: liveCandle.low,
      close: liveCandle.close,
    });

    const hist = histRef.current;
    const prevClose = hist.length ? hist[hist.length - 1].close : liveCandle.open;
    const vs = volSeriesRef.current;
    if (vs) {
      vs.update({
        time: t,
        value: liveCandle.volume,
        color: liveCandle.close >= prevClose ? VOL_UP : VOL_DOWN,
      });
    }

    const combined = [...hist, liveCandle];
    for (const { period, series } of maSeriesRef.current) {
      if (combined.length >= period) {
        let sum = 0;
        for (let i = combined.length - period; i < combined.length; i++) {
          sum += combined[i].close;
        }
        series.update({ time: t, value: sum / period });
      }
    }

    latestRef.current = liveCandle;
    setLegend({
      date: liveCandle.date,
      open: liveCandle.open,
      high: liveCandle.high,
      low: liveCandle.low,
      close: liveCandle.close,
    });
  }, [liveCandle]);

  const ohlcColor =
    legend && legend.close >= legend.open ? "text-up" : "text-down";

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {legend && (
          <div className={`flex gap-3 font-medium ${ohlcColor}`}>
            <span className="text-neutral-400">{legend.date}</span>
            <span>開 {fmtNum(legend.open)}</span>
            <span>高 {fmtNum(legend.high)}</span>
            <span>低 {fmtNum(legend.low)}</span>
            <span>收 {fmtNum(legend.close)}</span>
          </div>
        )}
        <div className="flex gap-3">
          {MA_CONFIG.map((ma) => (
            <span key={ma.period} style={{ color: ma.color }}>
              MA{ma.period}
            </span>
          ))}
        </div>
      </div>
      <div ref={containerRef} className={`${heightClass} w-full`} />
    </div>
  );
}
