/**
 * BONAGO AI — Deriv Trading Terminal Types
 */

export interface DerivAccount {
  loginid: string;
  currency: string;
  balance: number;
  is_virtual: boolean; // true = Demo, false = Real
  email?: string;
  fullname?: string;
  country?: string;
}

export interface DerivConnectionStatus {
  connected: boolean;
  authorized: boolean;
  account: DerivAccount | null;
  clientId: string;
  hasEnvToken: boolean;
  activeTokenSource: 'env' | 'custom' | 'none';
  error: string | null;
  pingMs?: number;
  mode: 'demo' | 'real';
}

export interface ActiveSymbol {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  submarket: string;
  submarket_display_name: string;
  exchange_is_open: boolean | number;
  pip: number;
  is_trading_suspended?: boolean | number;
}

export interface SymbolCategory {
  id: string;
  label: string;
  symbols: ActiveSymbol[];
}

export interface MarketTick {
  symbol: string;
  quote: number;
  ask?: number;
  bid?: number;
  epoch: number;
  change?: number;
  changePercent?: number;
}

export interface MarketCandle {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ContractProposal {
  id: string;
  ask_price: number;
  payout: number;
  net_profit: number;
  return_percent: number;
  spot: number;
  spot_time: number;
  longcode: string;
}

export type ContractType = 'CALL' | 'PUT' | 'DIGITMATCH' | 'DIGITDIFF' | 'DIGITOVER' | 'DIGITUNDER';

export interface BuyOrderRequest {
  symbol: string;
  contract_type: ContractType;
  amount: number;
  basis?: 'stake' | 'payout';
  currency?: string;
  duration: number;
  duration_unit: 't' | 's' | 'm' | 'h' | 'd';
  barrier?: string;
  prediction?: number;
}

export interface BuyOrderResponse {
  success: boolean;
  contract_id?: number;
  buy_price?: number;
  payout?: number;
  balance_after?: number;
  longcode?: string;
  error?: string;
  code?: string;
}

export interface OpenContract {
  contract_id: number;
  symbol: string;
  display_name: string;
  contract_type: string;
  buy_price: number;
  entry_spot: number;
  current_spot: number;
  payout: number;
  profit: number; // unrealized when open, realized when closed
  is_sold: boolean;
  is_expired: boolean;
  status: 'open' | 'won' | 'lost';
  date_purchase: number;
  date_expiry: number;
  barrier?: string;
  longcode: string;
  currency: string;
  duration_display?: string;
  remaining_seconds?: number;
}

export interface TradeHistoryItem {
  contract_id: number;
  symbol: string;
  display_name: string;
  contract_type: string;
  buy_price: number;
  payout: number;
  entry_spot: number;
  exit_spot: number;
  profit: number;
  status: 'won' | 'lost';
  date_purchase: number;
  date_expiry: number;
  currency: string;
  is_virtual: boolean;
  duration_display: string;
}

export interface AutoBotConfig {
  enabled: boolean;
  selectedMarkets: string[];
  maxStake: number;
  maxDailyLoss: number;
  takeProfit: number;
  maxOpenTrades: number;
  strategy: 'adaptive_ai' | 'rsi_mean_reversion' | 'momentum_breakout' | 'ema_trend';
  minConfidence: number; // e.g. 75
  tradeIntervalSec: number;
}

export interface AutoBotLog {
  id: string;
  timestamp: number;
  type: 'info' | 'trade' | 'risk_warning' | 'stop' | 'success';
  message: string;
  symbol?: string;
  details?: Record<string, any>;
}

export interface BotState {
  config: AutoBotConfig;
  isRunning: boolean;
  todayLoss: number;
  todayProfit: number;
  consecutiveLosses: number;
  totalBotTrades: number;
  winningBotTrades: number;
  losingBotTrades: number;
  stoppedReason: string | null;
  logs: AutoBotLog[];
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelUsed?: string;
  analysis?: {
    symbol?: string;
    currentPrice?: number;
    rsi?: number;
    trend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    recommendation?: 'CALL' | 'PUT' | 'HOLD';
    confidence?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    reasoning?: string[];
  };
  tradeActionProposal?: {
    symbol: string;
    symbolName: string;
    contractType: 'CALL' | 'PUT';
    stake: number;
    duration: number;
    durationUnit: 't' | 's' | 'm';
    estimatedPayout?: number;
    executed?: boolean;
    cancelled?: boolean;
  };
  error?: string;
}
