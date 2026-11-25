import React, { useState, useMemo } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import type { TradeHistoryItem } from '../types/deriv';

interface TradeHistoryProps {
  history: TradeHistoryItem[];
  onRefresh: () => void;
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ history, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'WON' | 'LOST'>('ALL');
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'DEMO' | 'REAL'>('ALL');

  // Filtered trades
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Result filter
      if (resultFilter === 'WON' && item.status !== 'won') return false;
      if (resultFilter === 'LOST' && item.status !== 'lost') return false;

      // Account filter
      if (accountFilter === 'DEMO' && !item.is_virtual) return false;
      if (accountFilter === 'REAL' && item.is_virtual) return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          item.symbol.toLowerCase().includes(query) ||
          item.display_name.toLowerCase().includes(query) ||
          String(item.contract_id).includes(query) ||
          item.contract_type.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [history, resultFilter, accountFilter, search]);

  // Overall performance metrics
  const stats = useMemo(() => {
    const total = history.length;
    const wins = history.filter((t) => t.status === 'won').length;
    const losses = history.filter((t) => t.status === 'lost').length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const netPnl = history.reduce((sum, t) => sum + t.profit, 0);
    const totalStake = history.reduce((sum, t) => sum + t.buy_price, 0);

    return { total, wins, losses, winRate, netPnl, totalStake };
  }, [history]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredHistory.length === 0) return;
    const headers = [
      'Contract ID',
      'Market',
      'Direction',
      'Stake',
      'Payout',
      'Net Profit',
      'Result',
      'Purchase Time',
      'Expiry Time',
      'Account Type',
    ];

    const rows = filteredHistory.map((t) => [
      t.contract_id,
      t.display_name || t.symbol,
      t.contract_type,
      t.buy_price.toFixed(2),
      t.payout.toFixed(2),
      t.profit.toFixed(2),
      t.status.toUpperCase(),
      new Date(t.date_purchase * 1000).toISOString(),
      new Date(t.date_expiry * 1000).toISOString(),
      t.is_virtual ? 'Demo' : 'Real',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bonago_trade_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Complete Trade History &amp; Settlement Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full record of all closed and settled contracts on Deriv.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={filteredHistory.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Total Settled Trades</span>
          <div className="text-2xl font-mono font-bold text-white mt-1">{stats.total}</div>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Win Rate</span>
          <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">
            {stats.winRate.toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {stats.wins} W / {stats.losses} L
          </span>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Net Profit / Loss</span>
          <div
            className={`text-2xl font-mono font-bold mt-1 ${
              stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}
          </div>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400">Total Capital Staked</span>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            ${stats.totalStake.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by contract ID or market..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#12192c] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Result Filters */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
            {(['ALL', 'WON', 'LOST'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResultFilter(r)}
                className={`px-3 py-1 rounded font-semibold text-xs ${
                  resultFilter === r
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Account Filter */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
            {(['ALL', 'DEMO', 'REAL'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAccountFilter(a)}
                className={`px-3 py-1 rounded font-semibold text-xs ${
                  accountFilter === a
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trade History Table */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#12192c] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Contract ID</th>
                <th className="py-3 px-4">Market</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4 text-right">Stake</th>
                <th className="py-3 px-4 text-right">Payout</th>
                <th className="py-3 px-4 text-right">Profit / Loss</th>
                <th className="py-3 px-4 text-center">Result</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No trade history records found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((trade) => {
                  const isWon = trade.status === 'won';
                  const isCall = trade.contract_type.includes('CALL') || trade.contract_type.includes('HIGHER');

                  return (
                    <tr
                      key={trade.contract_id}
                      className="hover:bg-slate-850/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-300 font-bold">
                        #{trade.contract_id}
                      </td>
                      <td className="py-3 px-4 font-sans text-white font-medium">
                        {trade.display_name || trade.symbol}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isCall
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {trade.contract_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        ${trade.buy_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        ${trade.payout.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          isWon ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isWon ? `+$${trade.profit.toFixed(2)}` : `-$${Math.abs(trade.profit).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isWon
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {isWon ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {trade.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                        {new Date(trade.date_purchase * 1000).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase">
                          {trade.is_virtual ? 'Demo' : 'Real'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
