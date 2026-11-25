/**
 * BONAGO AI — Automated Trading Bot Engine
 * Enforces strict risk controls, anti-martingale protection,
 * stop-loss limits, and multi-market algorithmic strategies.
 */

import { derivClient } from './derivClient';
import type { AutoBotConfig, AutoBotLog, BotState, ContractType } from '../src/types/deriv';

export class BotEngine {
  private state: BotState = {
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
  };

  private timer: NodeJS.Timeout | null = null;
  private isEvaluating = false;

  constructor() {
    this.addLog('info', 'BONAGO Algorithmic Bot Engine initialized with anti-martingale protection.');
  }

  public getState(): BotState {
    return { ...this.state, config: { ...this.state.config, selectedMarkets: [...this.state.config.selectedMarkets] }, logs: [...this.state.logs] };
  }

  public updateConfig(newConfig: Partial<AutoBotConfig>): BotState {
    const current = this.state.config;
    const numeric = (value: unknown, fallback: number, min: number, max: number): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
    };
    const selectedMarkets = Array.isArray(newConfig.selectedMarkets)
      ? [...new Set(newConfig.selectedMarkets.filter((symbol) => typeof symbol === 'string' && /^[A-Za-z0-9_]{2,32}$/.test(symbol)))].slice(0, 30)
      : current.selectedMarkets;
    const allowedStrategies = ['rsi_mean_reversion', 'momentum_breakout', 'ema_trend', 'adaptive_ai'];
    this.state.config = {
      ...current,
      ...newConfig,
      selectedMarkets: selectedMarkets.length ? selectedMarkets : current.selectedMarkets,
      maxStake: numeric(newConfig.maxStake, current.maxStake, 0.35, 50),
      maxDailyLoss: numeric(newConfig.maxDailyLoss, current.maxDailyLoss, 1, 500),
      takeProfit: numeric(newConfig.takeProfit, current.takeProfit, 1, 1000),
      maxOpenTrades: Math.round(numeric(newConfig.maxOpenTrades, current.maxOpenTrades, 1, 5)),
      minConfidence: numeric(newConfig.minConfidence, current.minConfidence, 50, 95),
      tradeIntervalSec: Math.round(numeric(newConfig.tradeIntervalSec, current.tradeIntervalSec, 10, 3600)),
      strategy: allowedStrategies.includes(String(newConfig.strategy)) ? newConfig.strategy! : current.strategy,
    };
    this.addLog('info', 'Bot configuration updated and risk limits validated.', undefined, { config: this.state.config });
    return this.getState();
  }

  public start(userConfig?: Partial<AutoBotConfig>): BotState {
    const derivStatus = derivClient.getStatus();
    if (!derivStatus.authorized || !derivStatus.account?.is_virtual || derivStatus.mode !== 'demo') {
      this.stop('Safety stop: A Deriv Demo account is required. Live trading is disabled.');
      this.state.stoppedReason = 'Cannot start bot: Deriv account is not authorized.';
      this.addLog('risk_warning', this.state.stoppedReason);
      return this.getState();
    }

    if (userConfig) {
      this.updateConfig(userConfig);
    }

    this.state.isRunning = true;
    this.state.stoppedReason = null;
    this.addLog('info', `Automated trading bot started. Strategy: ${this.state.config.strategy.toUpperCase()}. Max Stake: $${this.state.config.maxStake}. Daily Stop Loss: $${this.state.config.maxDailyLoss}.`);

    if (this.timer) {
      clearInterval(this.timer);
    }

    const intervalMs = Math.max(10, this.state.config.tradeIntervalSec) * 1000;
    this.timer = setInterval(() => this.evaluateCycle(), intervalMs);

    // Run first evaluation immediately
    setTimeout(() => this.evaluateCycle(), 1000);

    return this.getState();
  }

  public stop(reason: string = 'User stopped'): BotState {
    this.state.isRunning = false;
    this.state.stoppedReason = reason;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.addLog('stop', `Automated trading bot stopped: ${reason}`);
    return this.getState();
  }

  private addLog(type: AutoBotLog['type'], message: string, symbol?: string, details?: Record<string, any>) {
    const logItem: AutoBotLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      type,
      message,
      symbol,
      details,
    };

    this.state.logs.unshift(logItem);
    if (this.state.logs.length > 200) {
      this.state.logs.pop();
    }
  }

  private async evaluateCycle() {
    if (!this.state.isRunning || this.isEvaluating) return;
    this.isEvaluating = true;

    try {
      // Rebuild daily realized P/L from Deriv's closed-contract history on every
      // cycle so stop-loss/take-profit controls do not remain stuck at zero.
      const history = await derivClient.getTradeHistory();
      const dayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      const todaysClosed = history.filter((trade) => Number(trade.date_expiry || 0) >= dayStart);
      const realizedToday = todaysClosed.reduce((sum, trade) => sum + (Number(trade.profit) || 0), 0);
      this.state.todayProfit = Math.max(0, realizedToday);
      this.state.todayLoss = Math.max(0, -realizedToday);

      // 1. RISK CHECK: Daily Stop-Loss
      if (this.state.todayLoss >= this.state.config.maxDailyLoss) {
        this.stop(`Risk Stop: Maximum daily loss limit reached ($${this.state.todayLoss.toFixed(2)} >= $${this.state.config.maxDailyLoss.toFixed(2)})`);
        return;
      }

      // 2. RISK CHECK: Take-Profit Target
      if (this.state.config.takeProfit > 0 && this.state.todayProfit >= this.state.config.takeProfit) {
        this.stop(`Target Reached: Take-profit target achieved ($${this.state.todayProfit.toFixed(2)} >= $${this.state.config.takeProfit.toFixed(2)})`);
        return;
      }

      // 3. RISK CHECK: Max Open Trades
      const openPositions = await derivClient.syncOpenPositions();
      if (openPositions.length >= this.state.config.maxOpenTrades) {
        this.addLog('info', `Active positions (${openPositions.length}) at maximum limit (${this.state.config.maxOpenTrades}). Skipping trade signal.`);
        return;
      }

      // 4. Select next market from configuration
      const markets = this.state.config.selectedMarkets.length > 0 ? this.state.config.selectedMarkets : ['1HZ100V', 'R_50'];
      const targetSymbol = markets[Math.floor(Math.random() * markets.length)];

      // 5. Fetch market ticks for analysis
      const tickData = await derivClient.getHistoricalTicks(targetSymbol, 40, 'ticks');
      if (!tickData.history || !tickData.history.prices || tickData.history.prices.length < 15) {
        return;
      }

      const prices: number[] = tickData.history.prices.map(Number);
      const signal = this.calculateSignal(prices, this.state.config.strategy);

      if (!signal || signal.confidence < this.state.config.minConfidence) {
        return;
      }

      // Re-check account mode immediately before execution.
      const account = derivClient.getStatus().account;
      if (!account?.is_virtual) {
        this.stop('Safety stop: Demo account is no longer authorized.');
        return;
      }

      // Fixed stake; never increase after a loss.
      const stake = Math.min(this.state.config.maxStake, 50);

      this.addLog('trade', `Signal triggered on ${targetSymbol}: ${signal.direction} (${signal.reason}) with ${signal.confidence}% confidence. Executing stake $${stake.toFixed(2)}...`, targetSymbol);

      const buyRes = await derivClient.buyContract({
        symbol: targetSymbol,
        contract_type: signal.direction,
        amount: stake,
        duration: 5,
        duration_unit: 't', // 5 ticks duration
      });

      if (buyRes.success) {
        this.state.totalBotTrades++;
        this.addLog('success', `Contract #${buyRes.contract_id} opened successfully for ${targetSymbol} (${signal.direction}). Potential Payout: $${buyRes.payout?.toFixed(2)}.`, targetSymbol);
      } else {
        this.addLog('risk_warning', `Order execution failed on ${targetSymbol}: ${buyRes.error || 'Unknown error'}`, targetSymbol);
      }
    } catch (e: any) {
      console.error('[BotEngine] Evaluation cycle error:', e.message);
      this.addLog('risk_warning', `Cycle error: ${e.message}`);
    } finally {
      this.isEvaluating = false;
    }
  }

  private calculateSignal(
    prices: number[],
    strategy: AutoBotConfig['strategy']
  ): { direction: ContractType; confidence: number; reason: string } | null {
    const len = prices.length;
    const current = prices[len - 1];

    if (strategy === 'rsi_mean_reversion' || strategy === 'adaptive_ai') {
      // 14-period RSI
      let gains = 0;
      let losses = 0;
      const period = 14;

      for (let i = len - period; i < len; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));

      if (rsi <= 28) {
        return {
          direction: 'CALL',
          confidence: Math.min(92, Math.round(75 + (30 - rsi))),
          reason: `RSI Oversold (${rsi.toFixed(1)} <= 28)`,
        };
      } else if (rsi >= 72) {
        return {
          direction: 'PUT',
          confidence: Math.min(92, Math.round(75 + (rsi - 70))),
          reason: `RSI Overbought (${rsi.toFixed(1)} >= 72)`,
        };
      }
    }

    if (strategy === 'momentum_breakout') {
      const recent = prices.slice(-6);
      let consecutiveUp = 0;
      let consecutiveDown = 0;

      for (let i = 1; i < recent.length; i++) {
        if (recent[i] > recent[i - 1]) consecutiveUp++;
        if (recent[i] < recent[i - 1]) consecutiveDown++;
      }

      if (consecutiveUp >= 4) {
        return {
          direction: 'CALL',
          confidence: 78,
          reason: `Bullish momentum breakout (${consecutiveUp} consecutive upward ticks)`,
        };
      } else if (consecutiveDown >= 4) {
        return {
          direction: 'PUT',
          confidence: 78,
          reason: `Bearish momentum breakout (${consecutiveDown} consecutive downward ticks)`,
        };
      }
    }

    if (strategy === 'ema_trend') {
      // 5-period SMA vs 15-period SMA
      const fast = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const slow = prices.slice(-15).reduce((a, b) => a + b, 0) / 15;

      if (fast > slow && current > fast) {
        return {
          direction: 'CALL',
          confidence: 76,
          reason: 'Bullish moving average crossover (Fast SMA > Slow SMA)',
        };
      } else if (fast < slow && current < fast) {
        return {
          direction: 'PUT',
          confidence: 76,
          reason: 'Bearish moving average crossover (Fast SMA < Slow SMA)',
        };
      }
    }

    return null;
  }
}

export const botEngine = new BotEngine();
