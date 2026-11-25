import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Clock,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { MarketChart } from './MarketChart';
import { MarketSelectorModal } from './MarketSelectorModal';
import { fetchContractProposal, executeBuyOrder } from '../services/api';
import type {
  ActiveSymbol,
  MarketTick,
  OpenContract,
  ContractProposal,
  ContractType,
  BuyOrderResponse,
} from '../types/deriv';

interface TradingTerminalProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  symbols: ActiveSymbol[];
  ticks: MarketTick[];
  openPositions: OpenContract[];
  onTradeExecuted: () => void;
  isAuthorized: boolean;
  currency?: string;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  currentSymbol,
  onSelectSymbol,
  symbols,
  ticks,
  openPositions,
  onTradeExecuted,
  isAuthorized,
  currency = 'USD',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractType, setContractType] = useState<ContractType>('CALL');
  const [stake, setStake] = useState<number>(1.0);
  const [duration, setDuration] = useState<number>(5);
  const [durationUnit, setDurationUnit] = useState<'t' | 's' | 'm' | 'h'>('m');
  const [requireConfirmation, setRequireConfirmation] = useState<boolean>(true);
  const [pendingConfirm, setPendingConfirm] = useState<{ type: ContractType } | null>(null);
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [pendingEntry, setPendingEntry] = useState<{ type: ContractType; target: number; symbol: string } | null>(null);
  const livePrice = ticks.length ? ticks[ticks.length - 1].quote : null;

  // Proposal state
  const [callProposal, setCallProposal] = useState<ContractProposal | null>(null);
  const [putProposal, setPutProposal] = useState<ContractProposal | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<BuyOrderResponse | null>(null);

  const activeSymbolObj = symbols.find((s) => s.symbol === currentSymbol);
  const symbolName = activeSymbolObj?.display_name || currentSymbol;

  // Calculate proposals when parameters change
  useEffect(() => {
    let isCancelled = false;
    const updateProposals = async () => {
      setIsCalculating(true);
      setProposalError(null);

      try {
        const [callRes, putRes] = await Promise.allSettled([
          fetchContractProposal({
            symbol: currentSymbol,
            contract_type: 'CALL',
            amount: stake,
            duration,
            duration_unit: durationUnit,
            currency,
          }),
          fetchContractProposal({
            symbol: currentSymbol,
            contract_type: 'PUT',
            amount: stake,
            duration,
            duration_unit: durationUnit,
            currency,
          }),
        ]);

        if (isCancelled) return;

        if (callRes.status === 'fulfilled') {
          setCallProposal(callRes.value);
        } else {
          setProposalError(callRes.reason?.message || 'Proposal calculation error');
        }

        if (putRes.status === 'fulfilled') {
          setPutProposal(putRes.value);
        }
      } catch (e: any) {
        if (!isCancelled) setProposalError(e.message);
      } finally {
        if (!isCancelled) setIsCalculating(false);
      }
    };

    const timer = setTimeout(updateProposals, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentSymbol, stake, duration, durationUnit, currency]);

  const handleOrderClick = (type: ContractType) => {
    const target = entryPrice.trim() === '' ? null : Number(entryPrice);
    if (target !== null) {
      if (!Number.isFinite(target) || target <= 0) {
        setExecutionResult({ success: false, error: 'Enter a valid positive entry price, or clear the field for a market order.' });
        return;
      }
      if (pendingEntry) {
        setExecutionResult({ success: false, error: 'A price-triggered entry is already waiting. Cancel it before creating another.' });
        return;
      }
      const price = livePrice;
      const reached = price !== null && (type === 'CALL' ? price >= target : price <= target);
      if (reached) {
        if (requireConfirmation) setPendingConfirm({ type });
        else executeOrder(type);
      } else {
        setPendingEntry({ type, target, symbol: currentSymbol });
        setExecutionResult(null);
      }
      return;
    }
    if (requireConfirmation) {
      setPendingConfirm({ type });
    } else {
      executeOrder(type);
    }
  };

  const executeOrder = async (type: ContractType) => {
    if (!Number.isFinite(stake) || stake < 0.35 || stake > 50) {
      setExecutionResult({ success: false, error: `Enter a stake between ${currency} 0.35 and 50.` });
      return;
    }
    setIsExecuting(true);
    setExecutionResult(null);
    setPendingConfirm(null);

    try {
      const res = await executeBuyOrder({
        symbol: currentSymbol,
        contract_type: type,
        amount: stake,
        duration,
        duration_unit: durationUnit,
        currency,
      });

      setExecutionResult(res);
      onTradeExecuted();
    } catch (e: any) {
      setExecutionResult({
        success: false,
        error: e.message || 'Trade execution failed',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    if (!pendingEntry || pendingEntry.symbol !== currentSymbol || livePrice === null || isExecuting) return;
    const reached = pendingEntry.type === 'CALL'
      ? livePrice >= pendingEntry.target
      : livePrice <= pendingEntry.target;
    if (!reached) return;
    const triggered = pendingEntry;
    setPendingEntry(null);
    setExecutionResult({
      success: false,
      error: `Entry price reached at ${livePrice}. Confirm the order below to execute.`,
    });
    if (requireConfirmation) setPendingConfirm({ type: triggered.type });
    else executeOrder(triggered.type);
  }, [ticks, pendingEntry, livePrice, isExecuting, requireConfirmation]);

  const stakePresets = [0.35, 0.5, 1.0, 5.0, 10.0, 50.0];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)] p-4 overflow-y-auto">
      {/* Left / Center: Interactive Live Chart */}
      <div className="flex-1 flex flex-col min-h-[420px] lg:min-h-0">
        <div className="flex items-center justify-between mb-2">
          {/* Market Selector trigger */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0e1424] hover:bg-slate-800 border border-slate-800 text-white transition-all shadow-xs"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm">{symbolName}</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              {currentSymbol}
            </span>
            <Search className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          <span className="text-xs text-slate-400 hidden sm:block">
            Real-time Deriv WebSocket Feed
          </span>
        </div>

        <div className="flex-1 min-h-[380px]">
          <MarketChart
            symbol={currentSymbol}
            symbolName={symbolName}
            ticks={ticks}
            openPositions={openPositions}
            pip={activeSymbolObj?.pip || 0.01}
          />
        </div>
      </div>

      {/* Right: Manual Order Execution Panel */}
      <div className="w-full lg:w-96 bg-[#0b101e] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Manual Trade
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
              Rise / Fall
            </span>
          </div>

          {/* Stake Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">Stake Amount ({currency})</label>
              <span className="text-[11px] text-slate-500">Min $0.35</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Decrease stake by 0.35"
                onClick={() => setStake((value) => Math.max(0.35, Math.round((value - 0.35) * 100) / 100))}
                disabled={stake <= 0.35}
                className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 bg-slate-900 text-white text-xl disabled:opacity-40">−</button>
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="number" inputMode="decimal" min="0.35" max="50" step="0.01"
                  value={stake}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (e.target.value !== '' && Number.isFinite(parsed) && parsed >= 0.35 && parsed <= 50) setStake(parsed);
                  }}
                  aria-label="Custom trade stake amount"
                  className="w-full bg-[#121829] border border-slate-700/80 rounded-lg pl-9 pr-3 py-3 text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-500" />
              </div>
              <button type="button" aria-label="Increase stake by 0.35"
                onClick={() => setStake((value) => Math.min(50, Math.round((value + 0.35) * 100) / 100))}
                disabled={stake >= 50}
                className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 bg-slate-900 text-white text-xl disabled:opacity-40">+</button>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>Enter your own amount</span><span>Range: {currency} 0.35–50</span>
            </div>

            {/* Quick Stake Preset Buttons */}
            <div className="grid grid-cols-6 gap-1 mt-2">
              {stakePresets.map((val) => (
                <button
                  key={val}
                  onClick={() => setStake(val)}
                  className={`py-1 text-xs font-mono font-semibold rounded border transition-colors ${
                    stake === val
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Entry Price */}
          <div className="rounded-lg border border-cyan-900/60 bg-[#0d1322] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Custom Entry Price</label>
              <span className="text-[10px] text-slate-500">Optional · leave blank for market</span>
            </div>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder={livePrice === null ? "Enter target price" : `Live: ${livePrice}`}
              disabled={!!pendingEntry}
              aria-label="Custom entry price"
              className="w-full bg-[#121829] border border-slate-700/80 rounded-lg px-3 py-2.5 text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-500 disabled:opacity-60"
            />
            <p className="text-[10px] text-slate-500">CALL waits until price is at or above your target. PUT waits until price is at or below it. Execution is a market order when the trigger is observed; fill price may differ.</p>
            {pendingEntry && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-amber-700/50 bg-amber-950/30 p-2">
                <div className="text-[11px] text-amber-300">
                  <strong>Waiting for {pendingEntry.type} · {pendingEntry.symbol}</strong>
                  <div>Target {pendingEntry.target} · Live {livePrice ?? 'Waiting for tick'}</div>
                </div>
                <button type="button" onClick={() => setPendingEntry(null)} className="shrink-0 rounded bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white">Cancel</button>
              </div>
            )}
            {!pendingEntry && entryPrice.trim() !== '' && (
              <button type="button" onClick={() => setEntryPrice('')} className="text-[10px] text-cyan-400 hover:text-cyan-300">Clear entry price</button>
            )}
          </div>

          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">Contract Duration</label>
              <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800 text-xs">
                {(['t', 's', 'm', 'h'] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => {
                      setDurationUnit(unit);
                      if (unit === 't') setDuration(5);
                      else if (unit === 'm') setDuration(5);
                      else if (unit === 's') setDuration(30);
                      else if (unit === 'h') setDuration(1);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                      durationUnit === unit
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {unit === 't' ? 'Ticks' : unit === 's' ? 'Sec' : unit === 'm' ? 'Min' : 'Hrs'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                min="1"
                max={durationUnit === 't' ? 10 : 3600}
                value={duration}
                onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#121829] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-500"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {durationUnit === 't' ? 'Ticks range: 1–10 ticks' : `${duration} ${durationUnit === 'm' ? 'minutes' : durationUnit === 's' ? 'seconds' : 'hours'}`}
            </span>
          </div>

          {/* Real-Time Proposal Payout Box */}
          <div className="p-3 bg-[#0d1322] border border-slate-800 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Potential Payout:</span>
              <span className="font-mono font-bold text-white text-sm">
                ${callProposal ? callProposal.payout.toFixed(2) : (stake * 1.95).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Net Profit:</span>
              <span className="font-mono font-bold text-emerald-400">
                +${callProposal ? callProposal.net_profit.toFixed(2) : (stake * 0.95).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Expected Return:</span>
              <span className="font-mono font-bold text-cyan-400">
                +{callProposal ? callProposal.return_percent : 95.0}%
              </span>
            </div>

            {proposalError && (
              <div className="text-[11px] text-amber-400 bg-amber-950/40 p-1.5 rounded border border-amber-800/40">
                {proposalError}
              </div>
            )}
          </div>

          {/* Trade Confirmation Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs text-slate-400 cursor-pointer flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={requireConfirmation}
                onChange={(e) => setRequireConfirmation(e.target.checked)}
                className="rounded border-slate-700 text-cyan-600 focus:ring-0"
              />
              Confirm before placing order
            </label>
          </div>
        </div>

        {/* Execution Buttons: CALL (Rise) and PUT (Fall) */}
        <div className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* CALL (Rise) Button */}
            <button
              onClick={() => handleOrderClick('CALL')}
              disabled={isExecuting || !isAuthorized || !Number.isFinite(stake) || stake < 0.35 || stake > 50}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-950/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>CALL / RISE</span>
              </div>
              <span className="text-[11px] font-mono font-normal opacity-90">
                Payout: ${callProposal ? callProposal.payout.toFixed(2) : (stake * 1.95).toFixed(2)}
              </span>
            </button>

            {/* PUT (Fall) Button */}
            <button
              onClick={() => handleOrderClick('PUT')}
              disabled={isExecuting || !isAuthorized || !Number.isFinite(stake) || stake < 0.35 || stake > 50}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold text-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
            >
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>PUT / FALL</span>
              </div>
              <span className="text-[11px] font-mono font-normal opacity-90">
                Payout: ${putProposal ? putProposal.payout.toFixed(2) : (stake * 1.95).toFixed(2)}
              </span>
            </button>
          </div>

          {!isAuthorized && (
            <p className="text-[11px] text-amber-400 text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Please configure a Deriv token in Settings to place trades.
            </p>
          )}

          {/* Feedback Toast */}
          {executionResult && (
            <div
              className={`p-3 rounded-lg text-xs border ${
                executionResult.success
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {executionResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>{executionResult.success ? 'Order Placed Successfully!' : 'Order Rejected'}</span>
              </div>
              <p className="mt-1 font-mono text-[11px]">
                {executionResult.success
                  ? `Contract #${executionResult.contract_id} | Stake $${executionResult.buy_price?.toFixed(2)}`
                  : executionResult.error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#0e1422] border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Confirm Trade Execution
            </h3>

            <div className="bg-[#12192c] p-3 rounded-lg space-y-2 text-sm text-slate-300 font-mono mb-4 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Market:</span>
                <span className="text-white font-bold">{symbolName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Direction:</span>
                <span className={`font-bold ${pendingConfirm.type === 'CALL' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pendingConfirm.type} (Higher/Rise)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stake:</span>
                <span className="text-white">${stake.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="text-white">{duration} {durationUnit}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-2">
                <span className="text-slate-400">Potential Payout:</span>
                <span className="text-emerald-400 font-bold">
                  ${(pendingConfirm.type === 'CALL' ? callProposal?.payout : putProposal?.payout)?.toFixed(2) || (stake * 1.95).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPendingConfirm(null)}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executeOrder(pendingConfirm.type)}
                className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold shadow-lg transition-transform active:scale-95 ${
                  pendingConfirm.type === 'CALL'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                }`}
              >
                Confirm &amp; Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Market Selector Modal */}
      <MarketSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        symbols={symbols}
        currentSymbol={currentSymbol}
        onSelectSymbol={onSelectSymbol}
      />
    </div>
  );
};
