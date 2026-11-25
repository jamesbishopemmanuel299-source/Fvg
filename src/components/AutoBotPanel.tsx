import React, { useState } from 'react';
import {
  Bot,
  Play,
  Square,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Activity,
  Sliders,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import type { BotState, AutoBotConfig, ActiveSymbol } from '../types/deriv';

interface AutoBotPanelProps {
  botState: BotState;
  onStartBot: (config: Partial<AutoBotConfig>) => void;
  onStopBot: (reason?: string) => void;
  onUpdateConfig: (config: Partial<AutoBotConfig>) => void;
  symbols: ActiveSymbol[];
}

export const AutoBotPanel: React.FC<AutoBotPanelProps> = ({
  botState,
  onStartBot,
  onStopBot,
  onUpdateConfig,
  symbols,
}) => {
  const [config, setConfig] = useState<AutoBotConfig>(botState.config);

  const availableMarkets = [
    { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index' },
    { symbol: 'R_100', name: 'Volatility 100 Index' },
    { symbol: 'R_50', name: 'Volatility 50 Index' },
    { symbol: 'BOOM1000', name: 'Boom 1000 Index' },
    { symbol: 'CRASH1000', name: 'Crash 1000 Index' },
    { symbol: 'cryBTCUSD', name: 'BTC/USD' },
    { symbol: 'frxEURUSD', name: 'EUR/USD' },
  ];

  const handleToggleMarket = (sym: string) => {
    let nextMarkets: string[];
    if (config.selectedMarkets.includes(sym)) {
      if (config.selectedMarkets.length === 1) return; // Keep at least one
      nextMarkets = config.selectedMarkets.filter((m) => m !== sym);
    } else {
      nextMarkets = [...config.selectedMarkets, sym];
    }
    const updated = { ...config, selectedMarkets: nextMarkets };
    setConfig(updated);
    onUpdateConfig(updated);
  };

  const handleStart = () => {
    onStartBot(config);
  };

  const handleStop = () => {
    onStopBot('User stopped from panel');
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            Automated Algorithmic Trading Bot
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Rule-based and AI-assisted trade automation with strict capital protection.
          </p>
        </div>

        {/* Master Start / Stop Button */}
        {botState.isRunning ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-lg shadow-rose-950/50 transition-all transform active:scale-95"
          >
            <Square className="w-4 h-4 fill-white" />
            STOP AUTOMATED BOT
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 transition-all transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            START AUTOMATED BOT
          </button>
        )}
      </div>

      {/* Safety & Anti-Martingale Guarantee */}
      <div className="bg-[#0e1628] border border-cyan-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
              Capital Preservation &amp; Anti-Martingale Active
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Stakes are fixed and never multiplied to recover losses. Bot stops automatically upon hitting the daily loss limit. No false profit guarantees.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 whitespace-nowrap">
          Max Stake: <span className="text-cyan-400 font-bold">${config.maxStake.toFixed(2)}</span>
        </div>
      </div>

      {/* Status Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Bot Execution Status</span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                botState.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span className="text-base font-bold font-mono text-white">
              {botState.isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          {botState.stoppedReason && (
            <span className="text-[10px] text-amber-400 block mt-1 truncate">
              {botState.stoppedReason}
            </span>
          )}
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Daily Loss vs Stop-Loss</span>
          <div className="text-base font-mono font-bold text-rose-400 mt-1">
            ${botState.todayLoss.toFixed(2)} / ${config.maxDailyLoss.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Auto-stops if limit reached
          </span>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Profit vs Take-Profit</span>
          <div className="text-base font-mono font-bold text-emerald-400 mt-1">
            ${botState.todayProfit.toFixed(2)} / ${config.takeProfit.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Target lock-in enabled
          </span>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Bot Trades Executed</span>
          <div className="text-base font-mono font-bold text-white mt-1">
            {botState.totalBotTrades} trades
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {botState.winningBotTrades} Won / {botState.losingBotTrades} Lost
          </span>
        </div>
      </div>

      {/* Main Grid: Bot Controls + Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Risk Controls & Strategy Setup (7 cols) */}
        <div className="lg:col-span-7 bg-[#0e1424] border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Strategy &amp; Risk Parameters</h3>
          </div>

          {/* Strategy Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Trading Strategy
            </label>
            <select
              value={config.strategy}
              onChange={(e) => {
                const next = { ...config, strategy: e.target.value as any };
                setConfig(next);
                onUpdateConfig(next);
              }}
              className="w-full bg-[#12192c] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="rsi_mean_reversion">RSI Mean Reversion (Oversold &lt;28 / Overbought &gt;72)</option>
              <option value="momentum_breakout">Momentum Breakout (Tick Trend Acceleration)</option>
              <option value="ema_trend">EMA Moving Average Cross (Fast EMA &gt; Slow EMA)</option>
              <option value="adaptive_ai">AI-Driven Adaptive (Confluence of Momentum &amp; Trend)</option>
            </select>
          </div>

          {/* Markets Multi-Select */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Target Markets ({config.selectedMarkets.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableMarkets.map((m) => {
                const isSelected = config.selectedMarkets.includes(m.symbol);
                return (
                  <button
                    key={m.symbol}
                    type="button"
                    onClick={() => handleToggleMarket(m.symbol)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.symbol}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stake & Risk Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Max Stake per Trade ($)</label>
              <input
                type="number"
                min="0.35"
                max="50"
                step="0.5"
                value={config.maxStake}
                onChange={(e) => {
                  const val = Math.max(0.35, Math.min(50, Number(e.target.value)));
                  const next = { ...config, maxStake: val };
                  setConfig(next);
                  onUpdateConfig(next);
                }}
                className="w-full bg-[#12192c] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Anti-martingale fixed stake</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Daily Stop-Loss Limit ($)</label>
              <input
                type="number"
                min="1"
                max="500"
                value={config.maxDailyLoss}
                onChange={(e) => {
                  const next = { ...config, maxDailyLoss: Math.max(1, Number(e.target.value)) };
                  setConfig(next);
                  onUpdateConfig(next);
                }}
                className="w-full bg-[#12192c] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-rose-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Bot stops immediately if hit</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Take-Profit Target ($)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={config.takeProfit}
                onChange={(e) => {
                  const next = { ...config, takeProfit: Math.max(1, Number(e.target.value)) };
                  setConfig(next);
                  onUpdateConfig(next);
                }}
                className="w-full bg-[#12192c] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Target lock-in</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Max Concurrent Open Trades</label>
              <input
                type="number"
                min="1"
                max="5"
                value={config.maxOpenTrades}
                onChange={(e) => {
                  const next = { ...config, maxOpenTrades: Math.max(1, Math.min(5, Number(e.target.value))) };
                  setConfig(next);
                  onUpdateConfig(next);
                }}
                className="w-full bg-[#12192c] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Limits simultaneous exposure</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Min Confidence (%)</label>
              <input
                type="number"
                min="50"
                max="95"
                value={config.minConfidence}
                onChange={(e) => {
                  const next = { ...config, minConfidence: Math.max(50, Math.min(95, Number(e.target.value))) };
                  setConfig(next);
                  onUpdateConfig(next);
                }}
                className="w-full bg-[#12192c] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Threshold to fire trade</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Check Interval (Seconds)</label>
              <input
                type="number"
                min="10"
                max="120"
                value={config.tradeIntervalSec}
                onChange={(e) => {
                  const next = { ...config, tradeIntervalSec: Math.max(10, Number(e.target.value)) };
                  setConfig(next);
                  onUpdateConfig(next);
                }}
                className="w-full bg-[#12192c] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Time between evaluations</span>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Execution Logs (5 cols) */}
        <div className="lg:col-span-5 bg-[#0e1424] border border-slate-800 rounded-xl p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white text-sm">Live Execution Log</h3>
            </div>
            <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
              {botState.logs.length} entries
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-3 font-mono text-xs pr-1">
            {botState.logs.length === 0 ? (
              <div className="text-center py-16 text-slate-500 font-sans">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No bot activity recorded yet. Click &quot;START AUTOMATED BOT&quot; to begin.
              </div>
            ) : (
              botState.logs.map((log) => {
                let badgeColor = 'bg-slate-800 text-slate-300';
                if (log.type === 'trade') badgeColor = 'bg-cyan-950 text-cyan-400 border border-cyan-800/40';
                else if (log.type === 'success') badgeColor = 'bg-emerald-950 text-emerald-400 border border-emerald-800/40';
                else if (log.type === 'risk_warning') badgeColor = 'bg-amber-950 text-amber-400 border border-amber-800/40';
                else if (log.type === 'stop') badgeColor = 'bg-rose-950 text-rose-400 border border-rose-800/40';

                return (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-[#0a0f1c] border border-slate-800/70 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${badgeColor}`}>
                        {log.type}
                      </span>
                    </div>
                    <p className="text-slate-200 text-xs font-sans leading-relaxed">
                      {log.message}
                    </p>
                    {log.symbol && (
                      <span className="text-[10px] text-cyan-400 font-mono mt-1 block">
                        Market: {log.symbol}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
