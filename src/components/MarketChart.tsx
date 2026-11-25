import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Maximize2, Minimize2, BarChart2, TrendingUp, Sparkles } from 'lucide-react';
import type { MarketTick, MarketCandle, OpenContract } from '../types/deriv';

interface MarketChartProps {
  symbol: string;
  symbolName: string;
  ticks: MarketTick[];
  candles?: MarketCandle[];
  openPositions?: OpenContract[];
  currentPrice?: number;
  pip?: number;
}

export const MarketChart: React.FC<MarketChartProps> = ({
  symbol,
  symbolName,
  ticks,
  openPositions = [],
  currentPrice,
  pip = 0.01,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartMode, setChartMode] = useState<'ticks' | 'rsi'>('ticks');
  const [hoverData, setHoverData] = useState<{ x: number; y: number; price: number; time: string; rsi?: number } | null>(null);

  // Compute 14-period RSI from ticks
  const rsiData = useMemo(() => {
    if (ticks.length < 15) return [];
    const rsiValues: Array<{ time: number; value: number }> = [];
    const period = 14;

    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 1; i <= period; i++) {
      const diff = ticks[i].quote - ticks[i - 1].quote;
      if (diff >= 0) avgGain += diff;
      else avgLoss += Math.abs(diff);
    }

    avgGain /= period;
    avgLoss /= period;
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues.push({ time: ticks[period].epoch, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs) });

    for (let i = period + 1; i < ticks.length; i++) {
      const diff = ticks[i].quote - ticks[i - 1].quote;
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
      rsiValues.push({ time: ticks[i].epoch, value: rsi });
    }

    return rsiValues;
  }, [ticks]);

  // Compute 20-period SMA
  const smaData = useMemo(() => {
    if (ticks.length < 20) return [];
    const sma: Array<{ time: number; value: number }> = [];
    const period = 20;

    for (let i = period - 1; i < ticks.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += ticks[i - j].quote;
      }
      sma.push({ time: ticks[i].epoch, value: sum / period });
    }
    return sma;
  }, [ticks]);

  // Draw High-Performance Canvas Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#0a0f1b';
    ctx.fillRect(0, 0, width, height);

    if (ticks.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Connecting to Deriv real-time tick stream for ${symbol}...`, width / 2, height / 2);
      return;
    }

    // Determine layout: main chart height vs RSI sub-chart height
    const rsiHeight = chartMode === 'rsi' ? 80 : 0;
    const mainHeight = height - rsiHeight - 30; // 30px for time axis
    const paddingRight = 75; // for price axis
    const chartWidth = width - paddingRight;

    // Price scaling
    const quotes = ticks.map((t) => t.quote);
    const minPrice = Math.min(...quotes);
    const maxPrice = Math.max(...quotes);
    const priceRange = maxPrice - minPrice || 0.001;
    const paddedMin = minPrice - priceRange * 0.08;
    const paddedMax = maxPrice + priceRange * 0.08;
    const paddedRange = paddedMax - paddedMin;

    const getY = (val: number) => {
      return mainHeight - ((val - paddedMin) / paddedRange) * mainHeight + 10;
    };

    const getX = (index: number) => {
      return (index / (ticks.length - 1)) * chartWidth;
    };

    // Draw horizontal grid lines & price labels
    ctx.strokeStyle = '#161f36';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const p = paddedMin + (paddedRange / gridSteps) * i;
      const y = getY(p);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price label on right axis
      ctx.fillText(p.toFixed(pip > 0.001 ? 2 : 4), chartWidth + 6, y + 3);
    }

    // Draw vertical time grid lines
    const timeSteps = 4;
    for (let i = 0; i <= timeSteps; i++) {
      const idx = Math.floor((ticks.length - 1) * (i / timeSteps));
      const x = getX(idx);
      const t = ticks[idx];

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mainHeight + 10);
      ctx.stroke();

      if (t) {
        const date = new Date(t.epoch * 1000);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        ctx.fillText(timeStr, x - 20, height - 10);
      }
    }

    // Draw SMA line (cyan/amber)
    if (smaData.length > 1) {
      const offset = ticks.length - smaData.length;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      for (let i = 0; i < smaData.length; i++) {
        const x = getX(i + offset);
        const y = getY(smaData[i].value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Main Tick Line with Gradient Fill
    const gradient = ctx.createLinearGradient(0, 0, 0, mainHeight);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(ticks[0].quote));
    for (let i = 1; i < ticks.length; i++) {
      ctx.lineTo(getX(i), getY(ticks[i].quote));
    }
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill underneath
    ctx.lineTo(chartWidth, mainHeight + 10);
    ctx.lineTo(0, mainHeight + 10);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Active Open Positions Entry Spot Markers
    const symbolPositions = openPositions.filter((p) => p.symbol === symbol && p.status === 'open');
    symbolPositions.forEach((pos) => {
      const entryY = getY(pos.entry_spot);
      const isCall = pos.contract_type.includes('CALL') || pos.contract_type.includes('HIGHER');

      ctx.beginPath();
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = isCall ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Position Tag
      ctx.fillStyle = isCall ? '#064e3b' : '#881337';
      ctx.fillRect(chartWidth + 2, entryY - 9, 70, 18);
      ctx.fillStyle = isCall ? '#34d399' : '#fb7185';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${pos.contract_type} $${pos.buy_price.toFixed(1)}`, chartWidth + 5, entryY + 3);
    });

    // Draw Current Spot Price Line & Pulsing Dot
    const lastTick = ticks[ticks.length - 1];
    const lastX = getX(ticks.length - 1);
    const lastY = getY(lastTick.quote);

    // Current Price Dashed Line
    ctx.beginPath();
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, lastY);
    ctx.lineTo(chartWidth, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing dot at current price
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Current Price Badge on Right Axis
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(chartWidth + 2, lastY - 10, 70, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(lastTick.quote.toFixed(pip > 0.001 ? 2 : 4), chartWidth + 6, lastY + 4);

    // Draw RSI Sub-Chart if active
    if (chartMode === 'rsi' && rsiData.length > 2) {
      const rsiTop = height - rsiHeight - 20;

      // RSI background
      ctx.fillStyle = '#080d17';
      ctx.fillRect(0, rsiTop, chartWidth, rsiHeight);

      // RSI Overbought (70) and Oversold (30) lines
      const getYRsi = (val: number) => rsiTop + rsiHeight - (val / 100) * rsiHeight;

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, getYRsi(70));
      ctx.lineTo(chartWidth, getYRsi(70));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, getYRsi(30));
      ctx.lineTo(chartWidth, getYRsi(30));
      ctx.stroke();
      ctx.setLineDash([]);

      // RSI curve
      ctx.beginPath();
      const rsiOffset = ticks.length - rsiData.length;
      for (let i = 0; i < rsiData.length; i++) {
        const x = getX(i + rsiOffset);
        const y = getYRsi(rsiData[i].value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // RSI label
      const currentRsi = rsiData[rsiData.length - 1].value;
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`RSI(14): ${currentRsi.toFixed(1)}`, 10, rsiTop + 14);
      ctx.fillText('70 OB', chartWidth + 6, getYRsi(70) + 3);
      ctx.fillText('30 OS', chartWidth + 6, getYRsi(30) + 3);
    }
  }, [ticks, chartMode, rsiData, smaData, openPositions, symbol, pip]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || ticks.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartWidth = rect.width - 75;
    if (x < 0 || x > chartWidth) {
      setHoverData(null);
      return;
    }

    const index = Math.round((x / chartWidth) * (ticks.length - 1));
    const tick = ticks[index];
    if (tick) {
      const date = new Date(tick.epoch * 1000);
      setHoverData({
        x,
        y,
        price: tick.quote,
        time: date.toLocaleTimeString(),
      });
    }
  };

  const latestQuote = currentPrice ?? (ticks.length > 0 ? ticks[ticks.length - 1].quote : 0);
  const firstQuote = ticks.length > 0 ? ticks[0].quote : latestQuote;
  const priceDiff = latestQuote - firstQuote;
  const pctDiff = firstQuote > 0 ? (priceDiff / firstQuote) * 100 : 0;
  const isPositive = priceDiff >= 0;

  return (
    <div ref={containerRef} className="flex flex-col bg-[#0b101d] border border-slate-800 rounded-xl overflow-hidden h-full">
      {/* Chart Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-[#0e1424]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-wide">{symbolName}</span>
            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-cyan-400">
              {symbol}
            </span>
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
            <span className="text-lg font-mono font-bold text-white">
              {latestQuote.toFixed(pip > 0.001 ? 2 : 4)}
            </span>
            <span
              className={`text-xs font-mono font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                isPositive ? 'bg-emerald-950/80 text-emerald-400' : 'bg-rose-950/80 text-rose-400'
              }`}
            >
              <TrendingUp className={`w-3 h-3 ${!isPositive ? 'rotate-180' : ''}`} />
              {isPositive ? '+' : ''}
              {priceDiff.toFixed(pip > 0.001 ? 2 : 4)} ({isPositive ? '+' : ''}
              {pctDiff.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Indicators and view toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setChartMode('ticks')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                chartMode === 'ticks' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ticks
            </button>
            <button
              onClick={() => setChartMode(chartMode === 'rsi' ? 'ticks' : 'rsi')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                chartMode === 'rsi' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              RSI (14)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>SMA 20</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 min-h-[360px] w-full">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(null)}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Interactive Crosshair Tooltip */}
        {hoverData && (
          <div
            className="pointer-events-none absolute z-10 bg-slate-900/90 border border-cyan-500/50 rounded px-2.5 py-1 text-xs text-white font-mono shadow-xl -translate-x-1/2 -translate-y-full mb-2"
            style={{ left: hoverData.x, top: hoverData.y }}
          >
            <div className="text-cyan-300 font-bold">{hoverData.price.toFixed(pip > 0.001 ? 2 : 4)}</div>
            <div className="text-slate-400 text-[10px]">{hoverData.time}</div>
          </div>
        )}
      </div>
    </div>
  );
};
