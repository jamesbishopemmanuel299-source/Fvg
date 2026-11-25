import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Bot,
  Zap,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  ChevronRight,
  Shield,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { MarketChart } from './MarketChart';
import type {
  DerivConnectionStatus,
  BotState,
  OpenContract,
  TradeHistoryItem,
  ActiveSymbol,
  MarketTick,
} from '../types/deriv';
import type { NavTab } from './Sidebar';

interface DashboardProps {
  status: DerivConnectionStatus;
  botState: BotState;
  openPositions: OpenContract[];
  tradeHistory: TradeHistoryItem[];
  currentSymbol: string;
  symbols: ActiveSymbol[];
  ticks: MarketTick[];
  onNavigate: (tab: NavTab) => void;
  onSelectSymbol: (symbol: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  status,
  botState,
  openPositions,
  tradeHistory,
  currentSymbol,
  symbols,
  ticks,
  onNavigate,
  onSelectSymbol,
}) => {
  const account = status.account;
  const activeSymbolObj = symbols.find((s) => s.symbol === currentSymbol);
  const symbolName = activeSymbolObj?.display_name || currentSymbol;

  // Compute Today's P&L
  const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const todayTrades = tradeHistory.filter((t) => t.date_expiry >= startOfDay);
  const todayPnl = todayTrades.reduce((sum, t) => sum + t.profit, 0);

  const totalTrades = tradeHistory.length;
  const wins = tradeHistory.filter((t) => t.status === 'won').length;
  const losses = tradeHistory.filter((t) => t.status === 'lost').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  const totalOpenStake = openPositions.reduce((sum, p) => sum + p.buy_price, 0);
  const totalOpenProfit = openPositions.reduce((sum, p) => sum + p.profit, 0);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Welcome / Status Banner */}
      <div className="bg-gradient-to-r from-[#0d162b] to-[#0c1c2e] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-wide">
              BONAGO AI Trading Terminal
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              v3.2 Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time algorithmic binary execution on Deriv markets with anti-martingale protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('terminal')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Trade Now
          </button>
          <button
            onClick={() => onNavigate('ai_chat')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI Copilot
          </button>
        </div>
      </div>

      {/* KPI Stats Grid (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 1. Account Balance */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Account Balance</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
              {status.mode}
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {account
              ? `${account.currency} ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block truncate">
            {account?.loginid || 'Token not connected'}
          </span>
        </div>

        {/* 2. Today's P&L */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Today&apos;s Realized P&amp;L</span>
          <div
            className={`text-xl font-mono font-bold mt-1 ${
              todayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
            {todayTrades.length} trades settled today
          </span>
        </div>

        {/* 3. Win Rate */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Total Win Rate</span>
          <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
            {winRate.toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
            {wins} Won / {losses} Lost ({totalTrades} Total)
          </span>
        </div>

        {/* 4. Open Positions */}
        <div
          onClick={() => onNavigate('positions')}
          className="cursor-pointer bg-[#0e1424] border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Open Positions</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {openPositions.length} active
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
            ${totalOpenStake.toFixed(2)} staked capital
          </span>
        </div>

        {/* 5. Automated Bot Status */}
        <div
          onClick={() => onNavigate('auto_bot')}
          className="cursor-pointer bg-[#0e1424] border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition-colors col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Auto Bot Status</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                botState.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span className="text-base font-mono font-bold text-white">
              {botState.isRunning ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block truncate">
            {botState.config.strategy}
          </span>
        </div>
      </div>

      {/* Main Section: Chart Preview + Active Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Live Market Chart Preview (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{symbolName}</span>
              <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {currentSymbol}
              </span>
            </div>

            <button
              onClick={() => onNavigate('terminal')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              Full Screen Terminal <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1">
            <MarketChart
              symbol={currentSymbol}
              symbolName={symbolName}
              ticks={ticks}
              openPositions={openPositions}
              pip={activeSymbolObj?.pip || 0.01}
            />
          </div>
        </div>

        {/* Right: Active Open Positions Snapshot (4 cols) */}
        <div className="lg:col-span-4 bg-[#0e1424] border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Active Contracts</h3>
              </div>
              <span className="text-xs font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40">
                {openPositions.length} open
              </span>
            </div>

            <div className="overflow-y-auto max-h-[330px] space-y-2 pt-3 pr-1">
              {openPositions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No open contracts right now.
                  <button
                    onClick={() => onNavigate('terminal')}
                    className="mt-3 block mx-auto text-cyan-400 hover:underline font-semibold"
                  >
                    Open a position →
                  </button>
                </div>
              ) : (
                openPositions.map((pos) => {
                  const isCall = pos.contract_type.includes('CALL') || pos.contract_type.includes('HIGHER');
                  return (
                    <div
                      key={pos.contract_id}
                      className="p-3 rounded-lg bg-[#0a0f1c] border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{pos.display_name}</span>
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isCall
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {pos.contract_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-400 pt-1">
                        <div>
                          Stake: <span className="text-white">${pos.buy_price.toFixed(2)}</span>
                        </div>
                        <div>
                          Payout: <span className="text-emerald-400">${pos.payout.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-800/50">
                        <span>Contract #{pos.contract_id}</span>
                        <span className="text-cyan-400">Live monitoring</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('positions')}
            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            View All Open Positions →
          </button>
        </div>
      </div>
    </div>
  );
};
