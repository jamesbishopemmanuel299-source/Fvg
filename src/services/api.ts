/**
 * BONAGO AI — Frontend API Client
 * Communicates with server endpoints securely.
 */

import type {
  DerivConnectionStatus,
  ActiveSymbol,
  OpenContract,
  TradeHistoryItem,
  ContractProposal,
  BuyOrderRequest,
  BuyOrderResponse,
  BotState,
  AutoBotConfig,
  AiChatMessage,
} from '../types/deriv';

export async function fetchDerivStatus(): Promise<DerivConnectionStatus> {
  const res = await fetch('/api/deriv/status');
  if (!res.ok) throw new Error('Failed to fetch Deriv status');
  return res.json();
}

export async function reconnectDeriv(): Promise<DerivConnectionStatus> {
  const res = await fetch('/api/deriv/reconnect', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to connect to Deriv');
  return data;
}

export async function fetchActiveSymbols(): Promise<ActiveSymbol[]> {
  const res = await fetch('/api/deriv/symbols');
  if (!res.ok) throw new Error('Failed to fetch active symbols');
  return res.json();
}

export async function fetchHistoricalTicks(
  symbol: string,
  count = 100,
  style: 'ticks' | 'candles' = 'ticks',
  granularity = 60
): Promise<any> {
  const params = new URLSearchParams({
    symbol,
    count: String(count),
    style,
    granularity: String(granularity),
  });
  const res = await fetch(`/api/deriv/ticks?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch ticks');
  }
  return res.json();
}

export async function fetchContractProposal(params: {
  symbol: string;
  contract_type: string;
  amount: number;
  duration: number;
  duration_unit: string;
  currency?: string;
  basis?: string;
  barrier?: string;
}): Promise<ContractProposal> {
  const res = await fetch('/api/deriv/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to calculate proposal');
  }
  return res.json();
}

export async function executeBuyOrder(order: BuyOrderRequest): Promise<BuyOrderResponse> {
  const res = await fetch('/api/deriv/buy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  const data = await res.json().catch(() => ({ success: false, error: 'Network error' }));
  if (!res.ok) {
    throw new Error(data.error || 'Order execution rejected');
  }
  return data;
}

export async function fetchOpenPositions(): Promise<OpenContract[]> {
  const res = await fetch('/api/deriv/open-positions');
  if (!res.ok) throw new Error('Failed to fetch open positions');
  return res.json();
}

export async function fetchTradeHistory(): Promise<TradeHistoryItem[]> {
  const res = await fetch('/api/deriv/history');
  if (!res.ok) throw new Error('Failed to fetch trade history');
  return res.json();
}

export async function sendAiChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: { currentSymbol?: string; currentPrice?: number; autoTradingEnabled?: boolean }
): Promise<AiChatMessage> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI service error');
  }
  return res.json();
}

export async function fetchBotState(): Promise<BotState> {
  const res = await fetch('/api/bot/state');
  if (!res.ok) throw new Error('Failed to fetch bot state');
  return res.json();
}

export async function startBot(config?: Partial<AutoBotConfig>): Promise<BotState> {
  const res = await fetch('/api/bot/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start bot');
  }
  return res.json();
}

export async function stopBot(reason?: string): Promise<BotState> {
  const res = await fetch('/api/bot/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to stop bot');
  }
  return res.json();
}

export async function updateBotConfig(config: Partial<AutoBotConfig>): Promise<BotState> {
  const res = await fetch('/api/bot/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update bot config');
  }
  return res.json();
}
