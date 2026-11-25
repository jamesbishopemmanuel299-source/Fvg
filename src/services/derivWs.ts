/**
 * BONAGO AI — Deriv Live Market WebSocket Client (Browser)
 * Connects directly to Deriv's official WebSocket for real-time market data ticks,
 * tick history, and dynamic symbols.
 * Handles heartbeats, proper unsubscribe/forget logic to avoid "InputValidationFailed",
 * and smooth reconnection.
 */

import type { MarketTick, ActiveSymbol } from '../types/deriv';

type TickListener = (tick: MarketTick) => void;
type StatusListener = (connected: boolean) => void;
type HistoryListener = (symbol: string, ticks: MarketTick[]) => void;
type SymbolsListener = (symbols: ActiveSymbol[]) => void;

class DerivBrowserWs {
  private ws: WebSocket | null = null;
  private currentSymbol: string | null = null;
  private tickListeners = new Set<TickListener>();
  private statusListeners = new Set<StatusListener>();
  private historyListeners = new Set<HistoryListener>();
  private symbolsListeners = new Set<SymbolsListener>();
  private pingInterval: any = null;
  private reconnectTimer: any = null;
  private isConnected = false;
  private appId: string = '1089';
  private lastQuote: number | null = null;

  constructor() {
    this.connect();
  }

  public setAppId(appId: string) {
    if (this.appId !== appId) {
      this.appId = appId;
      this.reconnect();
    }
  }

  public connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      const url = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=EN`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus(true);
        this.startHeartbeat();

        // Request active symbols from Deriv
        this.requestActiveSymbols();

        // If a symbol was selected, fetch history and subscribe to ticks
        if (this.currentSymbol) {
          this.requestHistory(this.currentSymbol, 60);
          this.subscribeSymbol(this.currentSymbol);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          // ignore parse error
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.notifyStatus(false);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
        this.stopHeartbeat();
        this.reconnectTimer = setTimeout(() => this.connect(), 4000);
      };
    } catch {
      this.reconnectTimer = setTimeout(() => this.connect(), 6000);
    }
  }

  private reconnect() {
    if (this.ws) {
      this.ws.close();
    } else {
      this.connect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: 1 }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((fn) => {
      try {
        fn(connected);
      } catch {
        // ignore
      }
    });
  }

  public requestActiveSymbols() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));
      } catch {
        // ignore
      }
    }
  }

  public requestHistory(symbol: string, count = 60) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            ticks_history: symbol,
            end: 'latest',
            count,
            style: 'ticks',
          })
        );
      } catch {
        // ignore
      }
    }
  }

  private handleMessage(data: any) {
    // 1. Live Ticks Stream
    if (data.msg_type === 'tick' && data.tick) {
      const t = data.tick;
      const quote = Number(t.quote);
      let change = 0;
      let changePercent = 0;

      if (this.lastQuote !== null && this.lastQuote !== 0) {
        change = quote - this.lastQuote;
        changePercent = (change / this.lastQuote) * 100;
      }
      this.lastQuote = quote;

      const tick: MarketTick = {
        symbol: t.symbol,
        quote: quote,
        ask: Number(t.ask) || quote,
        bid: Number(t.bid) || quote,
        epoch: Number(t.epoch) || Math.floor(Date.now() / 1000),
        change,
        changePercent,
      };

      this.tickListeners.forEach((listener) => {
        try {
          listener(tick);
        } catch {
          // ignore
        }
      });
    }

    // 2. Historical Ticks
    if (data.msg_type === 'history' && data.history && data.echo_req?.ticks_history) {
      const sym = data.echo_req.ticks_history;
      const prices = data.history.prices || [];
      const times = data.history.times || [];
      const ticks: MarketTick[] = prices.map((p: any, idx: number) => ({
        symbol: sym,
        quote: Number(p),
        epoch: Number(times[idx]) || Math.floor(Date.now() / 1000),
      }));

      this.historyListeners.forEach((fn) => {
        try {
          fn(sym, ticks);
        } catch {
          // ignore
        }
      });
    }

    // 3. Dynamic Active Symbols
    if (data.msg_type === 'active_symbols' && Array.isArray(data.active_symbols)) {
      const symbols: ActiveSymbol[] = data.active_symbols.map((s: any) => ({
        symbol: s.symbol,
        display_name: s.display_name,
        market: s.market,
        market_display_name: s.market_display_name,
        submarket: s.submarket,
        submarket_display_name: s.submarket_display_name,
        exchange_is_open: Boolean(s.exchange_is_open),
        pip: s.pip || 0.01,
        is_trading_suspended: Boolean(s.is_trading_suspended),
      }));

      this.symbolsListeners.forEach((fn) => {
        try {
          fn(symbols);
        } catch {
          // ignore
        }
      });
    }
  }

  public subscribeSymbol(symbol: string) {
    if (!symbol) return;
    this.currentSymbol = symbol;
    this.lastQuote = null;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({ forget_all: 'ticks' }));
    } catch {
      // ignore
    }

    // Request history and subscribe to ticks
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentSymbol === symbol) {
        this.requestHistory(symbol, 60);
        this.ws.send(
          JSON.stringify({
            ticks: symbol,
            subscribe: 1,
          })
        );
      }
    }, 100);
  }

  public onTick(fn: TickListener): () => void {
    this.tickListeners.add(fn);
    return () => {
      this.tickListeners.delete(fn);
    };
  }

  public onHistory(fn: HistoryListener): () => void {
    this.historyListeners.add(fn);
    return () => {
      this.historyListeners.delete(fn);
    };
  }

  public onSymbols(fn: SymbolsListener): () => void {
    this.symbolsListeners.add(fn);
    return () => {
      this.symbolsListeners.delete(fn);
    };
  }

  public onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    fn(this.isConnected);
    return () => {
      this.statusListeners.delete(fn);
    };
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const derivBrowserWs = new DerivBrowserWs();
