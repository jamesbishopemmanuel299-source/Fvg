/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar, type NavTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TradingTerminal } from './components/TradingTerminal';
import { AiChat } from './components/AiChat';
import { AutoBotPanel } from './components/AutoBotPanel';
import { OpenPositions } from './components/OpenPositions';
import { TradeHistory } from './components/TradeHistory';
import { AccountSettings } from './components/AccountSettings';

import {
  fetchDerivStatus,
  fetchActiveSymbols,
  fetchHistoricalTicks,
  fetchOpenPositions,
  fetchTradeHistory,
  fetchBotState,
  startBot,
  stopBot,
  updateBotConfig,
} from './services/api';
import { derivBrowserWs } from './services/derivWs';

import type {
  DerivConnectionStatus,
  ActiveSymbol,
  MarketTick,
  OpenContract,
  TradeHistoryItem,
  BotState,
  AutoBotConfig,
} from './types/deriv';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Status & Account
  const [status, setStatus] = useState<DerivConnectionStatus>({
    connected: false,
    authorized: false,
    account: null,
    clientId: '1089',
    hasEnvToken: false,
    activeTokenSource: 'none',
    error: null,
    mode: 'demo',
  });

  // Symbols & Market Data
  const [symbols, setSymbols] = useState<ActiveSymbol[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState<string>('1HZ100V');
  const [ticks, setTicks] = useState<MarketTick[]>([]);
  const ticksBufferRef = useRef<MarketTick[]>([]);

  // Positions & History
  const [openPositions, setOpenPositions] = useState<OpenContract[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);

  // Bot State
  const [botState, setBotState] = useState<BotState>({
    isRunning: false,
    config: {
      enabled: false,
      selectedMarkets: ['1HZ100V', 'R_50'],
      maxStake: 1.0,
      maxDailyLoss: 10.0,
      takeProfit: 25.0,
      maxOpenTrades: 2,
      strategy: 'rsi_mean_reversion',
      minConfidence: 75,
      tradeIntervalSec: 20,
    },
    todayLoss: 0,
    todayProfit: 0,
    consecutiveLosses: 0,
    totalBotTrades: 0,
    winningBotTrades: 0,
    losingBotTrades: 0,
    stoppedReason: null,
    logs: [],
  });

  // 1. Initial Load: Fetch Status & Symbols
  const refreshStatus = useCallback(async () => {
    try {
      const s = await fetchDerivStatus();
      setStatus(s);
      if (s.clientId) {
        derivBrowserWs.setAppId(s.clientId);
      }
    } catch (e: any) {
      console.warn('Could not fetch Deriv status:', e.message);
    }
  }, []);

  const refreshPositions = useCallback(async () => {
    try {
      const positions = await fetchOpenPositions();
      setOpenPositions(positions);
    } catch (e) {
      // ignore
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const history = await fetchTradeHistory();
      setTradeHistory(history);
    } catch (e) {
      // ignore
    }
  }, []);

  const refreshBotState = useCallback(async () => {
    try {
      const bs = await fetchBotState();
      setBotState(bs);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshPositions();
    refreshHistory();
    refreshBotState();

    // Fetch dynamic symbols
    fetchActiveSymbols()
      .then((syms) => {
        setSymbols(syms);
      })
      .catch((e) => console.warn('Symbols fetch warning:', e));

    // Periodic polling for positions, status, and bot state
    const posInterval = setInterval(refreshPositions, 2500);
    const histInterval = setInterval(refreshHistory, 6000);
    const statusInterval = setInterval(refreshStatus, 8000);
    const botInterval = setInterval(refreshBotState, 4000);

    return () => {
      clearInterval(posInterval);
      clearInterval(histInterval);
      clearInterval(statusInterval);
      clearInterval(botInterval);
    };
  }, [refreshStatus, refreshPositions, refreshHistory, refreshBotState]);

  // 2. Load Historical Ticks when Symbol Changes
  useEffect(() => {
    let isCancelled = false;

    // First, load historical ticks for the chart
    fetchHistoricalTicks(currentSymbol, 60, 'ticks')
      .then((data) => {
        if (isCancelled) return;
        if (data.history && data.history.prices && data.history.times) {
          const loadedTicks: MarketTick[] = data.history.prices.map((p: any, idx: number) => ({
            symbol: currentSymbol,
            quote: Number(p),
            epoch: Number(data.history.times[idx]),
          }));
          ticksBufferRef.current = loadedTicks;
          setTicks(loadedTicks);
        }
      })
      .catch(() => {});

    // Subscribe browser WebSocket to real-time ticks
    derivBrowserWs.subscribeSymbol(currentSymbol);

    return () => {
      isCancelled = true;
    };
  }, [currentSymbol]);

  // 3. Listen to Real-Time Ticks, History, and Symbols from WebSocket
  useEffect(() => {
    const unsubTick = derivBrowserWs.onTick((tick) => {
      if (tick.symbol === currentSymbol) {
        ticksBufferRef.current = [...ticksBufferRef.current, tick].slice(-100);
        setTicks([...ticksBufferRef.current]);
      }
    });

    const unsubHistory = derivBrowserWs.onHistory((sym, histTicks) => {
      if (sym === currentSymbol && histTicks && histTicks.length > 0) {
        ticksBufferRef.current = histTicks.slice(-100);
        setTicks([...ticksBufferRef.current]);
      }
    });

    const unsubSymbols = derivBrowserWs.onSymbols((syms) => {
      if (syms && syms.length > 0) {
        setSymbols(syms);
      }
    });

    return () => {
      unsubTick();
      unsubHistory();
      unsubSymbols();
    };
  }, [currentSymbol]);

  // 4. Bot Handlers
  const handleStartBot = async (customConfig?: Partial<AutoBotConfig>) => {
    try {
      const nextState = await startBot(customConfig);
      setBotState(nextState);
    } catch (e: any) {
      alert(`Could not start bot: ${e.message}`);
    }
  };

  const handleStopBot = async (reason?: string) => {
    try {
      const nextState = await stopBot(reason);
      setBotState(nextState);
    } catch (e: any) {
      console.warn('Stop bot warning:', e.message);
    }
  };

  const handleUpdateBotConfig = async (config: Partial<AutoBotConfig>) => {
    try {
      const nextState = await updateBotConfig(config);
      setBotState(nextState);
    } catch (e: any) {
      console.warn('Update bot config warning:', e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        status={status}
        botState={botState}
        isWsLive={ticks.length > 0 || status.connected}
        onEmergencyStopBot={() => handleStopBot('Emergency kill-switch activated by user')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenSettings={() => setCurrentTab('settings')}
      />

      {/* Main Workspace: Left Sidebar + Center View */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          openPositionsCount={openPositions.length}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto bg-[#070b14]">
          {currentTab === 'dashboard' && (
            <Dashboard
              status={status}
              botState={botState}
              openPositions={openPositions}
              tradeHistory={tradeHistory}
              currentSymbol={currentSymbol}
              symbols={symbols}
              ticks={ticks}
              onNavigate={setCurrentTab}
              onSelectSymbol={setCurrentSymbol}
            />
          )}

          {currentTab === 'terminal' && (
            <TradingTerminal
              currentSymbol={currentSymbol}
              onSelectSymbol={setCurrentSymbol}
              symbols={symbols}
              ticks={ticks}
              openPositions={openPositions}
              onTradeExecuted={() => {
                refreshPositions();
                refreshHistory();
                refreshStatus();
              }}
              isAuthorized={status.authorized}
              currency={status.account?.currency || 'USD'}
            />
          )}

          {currentTab === 'ai_chat' && (
            <AiChat
              currentSymbol={currentSymbol}
              currentPrice={ticks.length > 0 ? ticks[ticks.length - 1].quote : undefined}
              autoTradingEnabled={botState.isRunning}
              onTradeExecuted={() => {
                refreshPositions();
                refreshHistory();
                refreshStatus();
              }}
              onStopBot={() => handleStopBot('Stopped via AI command')}
              onStartBot={() => handleStartBot()}
            />
          )}

          {currentTab === 'auto_bot' && (
            <AutoBotPanel
              botState={botState}
              onStartBot={handleStartBot}
              onStopBot={handleStopBot}
              onUpdateConfig={handleUpdateBotConfig}
              symbols={symbols}
            />
          )}

          {currentTab === 'positions' && (
            <OpenPositions
              positions={openPositions}
              onRefresh={refreshPositions}
            />
          )}

          {currentTab === 'history' && (
            <TradeHistory
              history={tradeHistory}
              onRefresh={refreshHistory}
            />
          )}

          {currentTab === 'settings' && (
            <AccountSettings
              status={status}
              onStatusUpdated={(updated) => {
                setStatus(updated);
                refreshPositions();
                refreshHistory();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
