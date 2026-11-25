import React, { useState, useMemo } from 'react';
import { Search, X, TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';
import type { ActiveSymbol } from '../types/deriv';

interface MarketSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbols: ActiveSymbol[];
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const MarketSelectorModal: React.FC<MarketSelectorModalProps> = ({
  isOpen,
  onClose,
  symbols,
  currentSymbol,
  onSelectSymbol,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Build market tabs from the live Deriv catalogue so new market groups
  // appear automatically without requiring another frontend release.
  const categories = useMemo(() => {
    const fixed = [
      { id: 'all', label: 'All Markets' },
      { id: 'volatility', label: 'Volatility Indices' },
      { id: 'crash_boom', label: 'Crash & Boom' },
      { id: 'forex', label: 'Forex' },
      { id: 'crypto', label: 'Crypto' },
      { id: 'commodities', label: 'Commodities' },
    ];
    const knownMarkets = new Set(['synthetic_index', 'forex', 'cryptocurrency', 'commodities']);
    const dynamic = Array.from(new Map<string, { id: string; label: string }>(
      symbols
        .filter((item) => item.market && !knownMarkets.has(item.market))
        .map((item): [string, { id: string; label: string }] => [item.market, {
          id: `market:${item.market}`,
          label: item.market_display_name || item.market.replace(/_/g, ' '),
        }])
    ).values()).sort((a, b) => a.label.localeCompare(b.label));
    return [...fixed, ...dynamic];
  }, [symbols]);

  const filteredSymbols = useMemo(() => {
    return symbols.filter((s) => {
      // Category filter
      if (selectedCategory === 'volatility') {
        const isVol = s.market === 'synthetic_index' && (s.submarket === 'random_index' || s.submarket === 'random_daily');
        if (!isVol) return false;
      } else if (selectedCategory === 'crash_boom') {
        const isCb = s.submarket === 'crash_boom' || s.symbol.includes('BOOM') || s.symbol.includes('CRASH');
        if (!isCb) return false;
      } else if (selectedCategory === 'forex') {
        if (s.market !== 'forex') return false;
      } else if (selectedCategory === 'crypto') {
        if (s.market !== 'cryptocurrency') return false;
      } else if (selectedCategory === 'commodities') {
        if (s.market !== 'commodities') return false;
      } else if (selectedCategory.startsWith('market:')) {
        if (s.market !== selectedCategory.slice('market:'.length)) return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(query) ||
          s.display_name.toLowerCase().includes(query) ||
          s.market_display_name?.toLowerCase().includes(query) ||
          s.submarket_display_name?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [symbols, selectedCategory, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0e1422] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white tracking-wide">Select Trading Market</h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
              {filteredSymbols.length} available
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-[#0a0f1b]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by symbol or name (e.g. Volatility 100, Boom 500, EUR/USD, BTC)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#12192c] border border-slate-700/80 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Categories Tab Bar */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Markets Grid/List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 divide-y divide-slate-800/40">
          {filteredSymbols.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No markets found matching &quot;{search}&quot;</p>
            </div>
          ) : (
            filteredSymbols.map((item) => {
              const isSelected = item.symbol === currentSymbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => {
                    onSelectSymbol(item.symbol);
                    onClose();
                  }}
                  className={`pt-1.5 first:pt-0 cursor-pointer group flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/50 text-white'
                      : 'border-transparent hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm group-hover:text-cyan-300 transition-colors">
                          {item.display_name}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                          {item.symbol}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {item.market_display_name || item.market} • {item.submarket_display_name || item.submarket}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-xs px-2 py-0.5 rounded ${item.exchange_is_open ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'bg-slate-800 text-slate-400'}`}>
                        {item.exchange_is_open ? 'Open 24/7' : 'Closed'}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-xs bg-cyan-500 text-black font-semibold px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
