import React, { useState, useEffect } from 'react';
import {
  Layers,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { OpenContract } from '../types/deriv';

interface OpenPositionsProps {
  positions: OpenContract[];
  onRefresh: () => void;
}

export const OpenPositions: React.FC<OpenPositionsProps> = ({ positions, onRefresh }) => {
  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));

  // Ticking countdown clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatRemaining = (expiryEpoch: number) => {
    if (!expiryEpoch) return 'Running';
    const diff = expiryEpoch - now;
    if (diff <= 0) return 'Settling...';
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalStake = positions.reduce((sum, p) => sum + p.buy_price, 0);
  const totalPotentialPayout = positions.reduce((sum, p) => sum + p.payout, 0);
  const totalLivePnl = positions.reduce((sum, p) => sum + p.profit, 0);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Open Contracts &amp; Position Monitoring
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time live contract updates from Deriv WebSocket feed.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Positions
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Total Active Contracts</span>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {positions.length}
          </div>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Total Capital at Stake</span>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            ${totalStake.toFixed(2)}
          </div>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Potential Total Payout</span>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
            ${totalPotentialPayout.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Open Positions List */}
      {positions.length === 0 ? (
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-12 text-center">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-white">No Open Positions</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            You currently have no active contracts running on Deriv. You can execute trades manually from the Live Chart terminal or start the automated bot.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const isCall = pos.contract_type.includes('CALL') || pos.contract_type.includes('HIGHER');
            const isProfit = pos.profit > 0;
            const remaining = formatRemaining(pos.date_expiry);

            return (
              <div
                key={pos.contract_id}
                className="bg-[#0e1424] border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all shadow-md"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                        isCall
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {isCall ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{pos.display_name}</span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          #{pos.contract_id}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            isCall
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.contract_type}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                        Purchased: {new Date(pos.date_purchase * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Countdown Timer */}
                    <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      <span className="text-xs text-slate-400">Expires in:</span>
                      <span className="text-xs font-mono font-bold text-white">{remaining}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/50 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>ACTIVE / OPEN</span>
                    </div>
                  </div>
                </div>

                {/* Contract Price and Spot Details */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Stake</span>
                    <span className="font-mono font-bold text-white text-sm">
                      ${pos.buy_price.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Entry Spot</span>
                    <span className="font-mono text-white text-sm">
                      {pos.entry_spot || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Current Spot</span>
                    <span className="font-mono text-cyan-300 font-bold text-sm">
                      {pos.current_spot || pos.entry_spot || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Potential Payout</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      ${pos.payout.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Live Unrealized P&amp;L</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        isProfit ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {pos.profit !== 0 ? (isProfit ? `+$${pos.profit.toFixed(2)}` : `-$${Math.abs(pos.profit).toFixed(2)}`) : 'Evaluating...'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
