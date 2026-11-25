/**
 * BONAGO AI — Trading Assistant AI Service
 * Supports Groq (GPT-OSS-120B or LLaMA 3.3) and Google GenAI (gemini-4-hydrogen).
 * Analyzes real live market data, explains technical signals (RSI, trend, momentum),
 * provides structured trade confirmations, and respects user safety limits.
 */

import { GoogleGenAI } from '@google/genai';
import { derivClient } from './derivClient';
import type { AiChatMessage } from '../src/types/deriv';

export class AiTradingService {
  private geminiAi: GoogleGenAI | null = null;


  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.geminiAi = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  public async processChat(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    clientContext?: {
      currentSymbol?: string;
      currentPrice?: number;
      autoTradingEnabled?: boolean;
    }
  ): Promise<Partial<AiChatMessage>> {
    // 1. Collect real Deriv live context
    const derivStatus = derivClient.getStatus();
    const openPositions = await derivClient.syncOpenPositions();
    const tradeHistory = await derivClient.getTradeHistory();
    const symbols = await derivClient.fetchActiveSymbols();

    // Compute today's profit from closed trades
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const todayTrades = tradeHistory.filter((t) => t.date_expiry >= startOfDay);
    const todayPnl = todayTrades.reduce((acc, t) => acc + t.profit, 0);

    // Context summary
    const accountInfo = derivStatus.account
      ? `Account: ${derivStatus.account.loginid} (${derivStatus.mode.toUpperCase()}) | Balance: ${derivStatus.account.currency} ${derivStatus.account.balance.toFixed(2)} | Currency: ${derivStatus.account.currency}`
      : 'Deriv Account: Not logged in or waiting for token.';

    const openPositionsSummary = openPositions.length > 0
      ? openPositions.map((p) => `#${p.contract_id}: ${p.display_name} ${p.contract_type} | Stake: $${p.buy_price.toFixed(2)} | P&L: $${p.profit.toFixed(2)} | Status: ${p.status}`).join('\n')
      : 'No open contracts currently.';

    const todaySummary = `Today's Trades: ${todayTrades.length} | Realized P&L: $${todayPnl.toFixed(2)} | Open Positions: ${openPositions.length}`;

    // 2. Detect if user is asking to analyze a specific symbol or execute trade
    const targetSymbol = this.detectSymbol(message, symbols, clientContext?.currentSymbol);
    let marketTickData: any = null;
    let technicalIndicators: { rsi: number; trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; sma20?: number } | null = null;

    if (targetSymbol) {
      try {
        const historyRes = await derivClient.getHistoricalTicks(targetSymbol.symbol, 30, 'ticks');
        if (historyRes.history && historyRes.history.prices) {
          const prices: number[] = historyRes.history.prices.map(Number);
          const currentPrice = prices[prices.length - 1];
          marketTickData = {
            symbol: targetSymbol.symbol,
            displayName: targetSymbol.display_name,
            currentPrice,
            recentPrices: prices.slice(-10),
          };
          technicalIndicators = this.calculateBasicIndicators(prices);
        }
      } catch (e: any) {
        console.warn(`[AI Service] Could not fetch live tick history for ${targetSymbol.symbol}:`, e.message);
      }
    }

    // 3. Construct System Prompt
    const systemPrompt = `You are BONAGO AI, an elite algorithmic Deriv trading analyst and execution copilot.
You operate on real live market data from Deriv API.

LIVE ACCOUNT STATUS:
${accountInfo}
${todaySummary}

CURRENT OPEN POSITIONS:
${openPositionsSummary}

${marketTickData ? `TARGET MARKET DATA:
Symbol: ${marketTickData.symbol} (${marketTickData.displayName})
Current Price: ${marketTickData.currentPrice}
Calculated RSI (14): ${technicalIndicators?.rsi?.toFixed(1) || 'N/A'}
Market Trend: ${technicalIndicators?.trend || 'NEUTRAL'}
` : ''}

RULES:
1. NEVER invent fictitious prices, fictional balances, or imaginary market quotes. Use the real numbers provided above.
2. If the user asks about their balance, open positions, or today's profit, quote the exact real metrics above.
3. If the user asks for market analysis, assess price action, RSI (>70 Overbought, <30 Oversold), trend momentum, support/resistance, and state a clear confidence level (e.g. 75%) and risk warning.
4. If the user commands to place a trade (e.g. "Buy CALL on Volatility 50", "Trade Boom 100 with $1 stake"):
   - You MUST request user confirmation unless auto-trading is active.
   - Output your recommendation, confidence, and structured action details.
5. If the user says "Stop automatic trading" or "Start bot", instruct them accordingly or acknowledge the command.
6. Always explain trading decisions clearly, professionally, and honestly without false guarantees. Binary options and CFDs carry high risk.
7. Return exact Deriv provider errors if any operation fails.`;

    // 4. Try Groq first if key is present (with gpt-oss-120b or llama-3.3-70b-versatile)
    let aiResponseText = '';
    let modelNameUsed = '';

    if (this.getGroqApiKey()) {
      try {
        const groqResult = await this.callGroq(systemPrompt, history, message);
        aiResponseText = groqResult.text;
        modelNameUsed = groqResult.model;
      } catch (e: any) {
        console.warn('[AI Service] Groq call failed, falling back to Gemini:', e.message);
      }
    }

    // 5. Fallback or primary to Gemini if Groq wasn't used or failed
    if (!aiResponseText) {
      if (this.geminiAi) {
        try {
          const contents = [
            ...history.map((h) => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }],
            })),
            { role: 'user', parts: [{ text: message }] },
          ];

          const response = await this.geminiAi.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: contents as any,
            config: {
              systemInstruction: systemPrompt,
            },
          });

          aiResponseText = response.text || 'Analysis complete.';
          modelNameUsed = 'gemini-4-hydrogen';
        } catch (geminiErr: any) {
          console.warn('[AI Service] Gemini temporary error, using engine fallback:', geminiErr.message);
          aiResponseText = this.getDeterministicResponse(message, derivStatus, openPositions, todayPnl, targetSymbol, marketTickData, technicalIndicators);
          modelNameUsed = 'bonago-copilot-engine';
        }
      } else {
        // Simple deterministic rule-based assistant if no AI keys configured
        aiResponseText = this.getDeterministicResponse(message, derivStatus, openPositions, todayPnl, targetSymbol, marketTickData, technicalIndicators);
        modelNameUsed = 'bonago-rule-engine';
      }
    }

    // 6. Check if a trade execution proposal should be attached to the message
    const tradeProposal = this.extractTradeProposal(message, aiResponseText, targetSymbol, clientContext);

    return {
      role: 'assistant',
      content: aiResponseText,
      modelUsed: modelNameUsed,
      timestamp: Date.now(),
      analysis: targetSymbol && marketTickData && technicalIndicators ? {
        symbol: targetSymbol.symbol,
        currentPrice: marketTickData.currentPrice,
        rsi: technicalIndicators.rsi,
        trend: technicalIndicators.trend,
        recommendation: technicalIndicators.rsi > 70 ? 'PUT' : technicalIndicators.rsi < 30 ? 'CALL' : 'HOLD',
        confidence: technicalIndicators.rsi > 70 || technicalIndicators.rsi < 30 ? 78 : 62,
        riskLevel: 'MEDIUM',
        reasoning: [
          `RSI at ${technicalIndicators.rsi.toFixed(1)} indicates ${technicalIndicators.rsi > 70 ? 'overbought exhaustion' : technicalIndicators.rsi < 30 ? 'oversold bounce potential' : 'balanced momentum'}.`,
          `Recent trend is ${technicalIndicators.trend.toLowerCase()} across sampled ticks.`,
          'Deriv volatility indices have dynamic volatility; always apply strict stop-loss.'
        ],
      } : undefined,
      tradeActionProposal: tradeProposal,
    };
  }

  public getRuntimeConfigStatus() {
    return {
      groqApiKeyConfigured: Boolean((process.env.GROQ_API_KEY || '').trim()),
      groqModel: (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim(),
      geminiApiKeyConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
    };
  }

  private getGroqApiKey(): string | null {
    const key = (process.env.GROQ_API_KEY || '').trim();
    return key || null;
  }

  private async callGroq(systemPrompt: string, history: Array<{ role: string; content: string }>, userMessage: string): Promise<{ text: string; model: string }> {
    const apiKey = this.getGroqApiKey();
    if (!apiKey) throw new Error('GROQ_API_KEY is missing from the Render environment.');
    const configuredModel = (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim();
    const modelsToTry = [...new Set([configuredModel, 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile'])];
    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
              { role: 'user', content: userMessage },
            ],
            temperature: 0.3,
            max_tokens: 800,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Groq HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        return { text, model: `groq/${model}` };
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Groq models unavailable');
  }

  private detectSymbol(message: string, symbols: any[], defaultSymbol?: string): any {
    const msg = message.toLowerCase();
    
    // Check known common words
    if (msg.includes('volatility 100') || msg.includes('vol 100') || msg.includes('r_100') || msg.includes('1hz100v')) {
      return symbols.find((s) => s.symbol === '1HZ100V' || s.symbol === 'R_100') || { symbol: 'R_100', display_name: 'Volatility 100 Index' };
    }
    if (msg.includes('volatility 50') || msg.includes('vol 50') || msg.includes('r_50') || msg.includes('1hz50v')) {
      return symbols.find((s) => s.symbol === '1HZ50V' || s.symbol === 'R_50') || { symbol: 'R_50', display_name: 'Volatility 50 Index' };
    }
    if (msg.includes('volatility 75') || msg.includes('vol 75') || msg.includes('r_75')) {
      return symbols.find((s) => s.symbol === '1HZ75V' || s.symbol === 'R_75') || { symbol: 'R_75', display_name: 'Volatility 75 Index' };
    }
    if (msg.includes('volatility 25') || msg.includes('vol 25') || msg.includes('r_25')) {
      return symbols.find((s) => s.symbol === '1HZ25V' || s.symbol === 'R_25') || { symbol: 'R_25', display_name: 'Volatility 25 Index' };
    }
    if (msg.includes('volatility 10') || msg.includes('vol 10') || msg.includes('r_10')) {
      return symbols.find((s) => s.symbol === '1HZ10V' || s.symbol === 'R_10') || { symbol: 'R_10', display_name: 'Volatility 10 Index' };
    }
    if (msg.includes('boom 1000') || msg.includes('boom 100')) {
      return symbols.find((s) => s.symbol === 'BOOM1000') || { symbol: 'BOOM1000', display_name: 'Boom 1000 Index' };
    }
    if (msg.includes('boom 500')) {
      return symbols.find((s) => s.symbol === 'BOOM500') || { symbol: 'BOOM500', display_name: 'Boom 500 Index' };
    }
    if (msg.includes('crash 1000')) {
      return symbols.find((s) => s.symbol === 'CRASH1000') || { symbol: 'CRASH1000', display_name: 'Crash 1000 Index' };
    }
    if (msg.includes('crash 500')) {
      return symbols.find((s) => s.symbol === 'CRASH500') || { symbol: 'CRASH500', display_name: 'Crash 500 Index' };
    }
    if (msg.includes('eur/usd') || msg.includes('eurusd')) {
      return symbols.find((s) => s.symbol === 'frxEURUSD') || { symbol: 'frxEURUSD', display_name: 'EUR/USD' };
    }
    if (msg.includes('btc') || msg.includes('bitcoin')) {
      return symbols.find((s) => s.symbol === 'cryBTCUSD') || { symbol: 'cryBTCUSD', display_name: 'BTC/USD' };
    }
    if (msg.includes('gold')) {
      return symbols.find((s) => s.symbol === 'frxXAUUSD') || { symbol: 'frxXAUUSD', display_name: 'Gold/USD' };
    }

    if (defaultSymbol) {
      return symbols.find((s) => s.symbol === defaultSymbol) || { symbol: defaultSymbol, display_name: defaultSymbol };
    }

    return null;
  }

  private calculateBasicIndicators(prices: number[]): { rsi: number; trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; sma20?: number } {
    if (prices.length < 5) {
      return { rsi: 50, trend: 'NEUTRAL' };
    }

    // 14-period RSI
    let gains = 0;
    let losses = 0;
    const period = Math.min(14, prices.length - 1);

    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    let rsi = 50;

    if (avgLoss === 0) {
      rsi = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    }

    // Trend
    const firstPrice = prices[prices.length - period];
    const lastPrice = prices[prices.length - 1];
    const pctChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    const trend = pctChange > 0.05 ? 'BULLISH' : pctChange < -0.05 ? 'BEARISH' : 'NEUTRAL';

    return { rsi, trend };
  }

  private extractTradeProposal(
    message: string,
    aiText: string,
    targetSymbol: any,
    clientContext?: any
  ): any {
    const msg = message.toLowerCase();
    const isTradeIntent = msg.includes('trade') || msg.includes('buy') || msg.includes('call') || msg.includes('put');
    if (!isTradeIntent) return undefined;

    // Detect direction
    let contractType: 'CALL' | 'PUT' = 'CALL';
    if (msg.includes('put') || msg.includes('fall') || msg.includes('sell') || msg.includes('lower')) {
      contractType = 'PUT';
    } else if (msg.includes('call') || msg.includes('rise') || msg.includes('higher') || msg.includes('buy')) {
      contractType = 'CALL';
    }

    // Detect stake
    let stake = 1.0;
    const dollarMatch = message.match(/\$(\d+(?:\.\d+)?)/);
    const stakeWordMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:usd|stake|dollars?)/i);
    if (dollarMatch && Number(dollarMatch[1]) > 0) {
      stake = Number(dollarMatch[1]);
    } else if (stakeWordMatch && Number(stakeWordMatch[1]) > 0) {
      stake = Number(stakeWordMatch[1]);
    }

    // Detect duration
    let duration = 5;
    let durationUnit: 't' | 's' | 'm' = 'm';
    if (msg.includes('tick')) {
      const tickMatch = msg.match(/(\d+)\s*ticks?/);
      if (tickMatch) {
        duration = Math.min(10, Math.max(1, Number(tickMatch[1])));
        durationUnit = 't';
      }
    } else if (msg.includes('min') || msg.includes('minute')) {
      const minMatch = msg.match(/(\d+)\s*min/);
      if (minMatch) {
        duration = Math.min(60, Math.max(1, Number(minMatch[1])));
        durationUnit = 'm';
      }
    }

    const symbol = targetSymbol?.symbol || clientContext?.currentSymbol || 'R_100';
    const symbolName = targetSymbol?.display_name || symbol;

    return {
      symbol,
      symbolName,
      contractType,
      stake,
      duration,
      durationUnit,
      executed: false,
    };
  }

  private getDeterministicResponse(
    message: string,
    derivStatus: any,
    openPositions: any[],
    todayPnl: number,
    targetSymbol: any,
    marketTickData: any,
    technicalIndicators: any
  ): string {
    const msg = message.toLowerCase();

    if (msg.includes('open position') || msg.includes('positions')) {
      if (openPositions.length === 0) {
        return 'You have no open contracts at the moment. All positions are currently settled.';
      }
      return `You currently have ${openPositions.length} open contract(s):\n` +
        openPositions.map((p) => `• Contract #${p.contract_id}: ${p.display_name} ${p.contract_type} | Stake: $${p.buy_price.toFixed(2)} | Current Spot: ${p.current_spot} | Live P&L: $${p.profit.toFixed(2)}`).join('\n');
    }

    if (msg.includes('profit') || msg.includes('balance') || msg.includes('today')) {
      const acc = derivStatus.account;
      if (!acc) {
        return 'Deriv account is not connected yet. Please check your Deriv API token in Settings.';
      }
      return `Account: ${acc.loginid} (${derivStatus.mode.toUpperCase()})\nBalance: ${acc.currency} ${acc.balance.toFixed(2)}\nToday's Realized Profit/Loss: $${todayPnl.toFixed(2)}\nActive Open Positions: ${openPositions.length}`;
    }

    if (targetSymbol && marketTickData && technicalIndicators) {
      const rec = technicalIndicators.rsi > 70 ? 'PUT' : technicalIndicators.rsi < 30 ? 'CALL' : 'CAUTION / HOLD';
      return `📊 Analysis for **${targetSymbol.display_name} (${targetSymbol.symbol})**:\n\n` +
        `• Current Spot Price: **${marketTickData.currentPrice}**\n` +
        `• 14-period RSI: **${technicalIndicators.rsi.toFixed(1)}**\n` +
        `• Short-term Momentum: **${technicalIndicators.trend}**\n` +
        `• Signal Recommendation: **${rec}**\n\n` +
        `Summary: ${technicalIndicators.rsi > 70 ? 'Price is exhibiting overbought conditions; downside pullback likely.' : technicalIndicators.rsi < 30 ? 'Price is showing oversold characteristics; potential upward bounce.' : 'Market is fluctuating within equilibrium range. Wait for breakout or test of boundaries.'}\n\n` +
        `⚠️ Risk Warning: Deriv volatility indices carry substantial variance. Always manage stake sizes strictly.`;
    }

    return `I am BONAGO AI, your Deriv trading copilot. You can ask me to:\n` +
      `• "Analyze Volatility 100 Index"\n` +
      `• "Buy CALL on Volatility 50 for 5 minutes with $1 stake"\n` +
      `• "Show my open positions"\n` +
      `• "What is my profit today?"\n` +
      `• "Stop automatic trading"\n\n` +
      `Currently connected: ${derivStatus.authorized ? `Logged in as ${derivStatus.account?.loginid}` : 'Waiting for Deriv authorization'}.`;
  }
}

export const aiTradingService = new AiTradingService();
