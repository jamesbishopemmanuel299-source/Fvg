import React from 'react';
import {
  Activity,
  Shield,
  ShieldAlert,
  Wifi,
  WifiOff,
  Power,
  Bot,
  Menu,
  Zap,
} from 'lucide-react';
import type { DerivConnectionStatus, BotState } from '../types/deriv';

interface HeaderProps {
  status: DerivConnectionStatus;
  botState: BotState;
  isWsLive?: boolean;
  onEmergencyStopBot: () => void;
  onToggleMobileMenu: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  botState,
  isWsLive = true,
  onEmergencyStopBot,
  onToggleMobileMenu,
  onOpenSettings,
}) => {
  const account = status.account;
  const isDemo = status.mode === 'demo';

  return (
    <header className="h-16 bg-[#090d18] border-b border-slate-800/80 px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Mobile Toggle + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <div className="w-full h-full bg-[#090d18] rounded-[7px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-white">BONAGO</span>
              <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                AI
              </span>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:block tracking-wide">
              DERIV ALGORITHMIC TERMINAL
            </span>
          </div>
        </div>
      </div>

      {/* Center: Live Connection & Bot Status */}
      <div className="hidden md:flex items-center gap-3">
        {/* Connection status badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
          {isWsLive || status.connected ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Market WS Active</span>
              <span className="text-slate-500 font-mono text-[10px] pl-1">
                (Deriv {status.authorized ? 'Auth' : 'Feed'})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Connecting Feed...</span>
            </div>
          )}
        </div>

        {/* Auto-bot status badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs transition-colors ${
            botState.isRunning
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Bot: {botState.isRunning ? 'Active & Monitoring' : 'Idle'}</span>
          {botState.isRunning && (
            <button
              onClick={onEmergencyStopBot}
              className="ml-1 text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-0.5 rounded transition-colors"
            >
              STOP
            </button>
          )}
        </div>
      </div>

      {/* Right: Account ID, Demo/Live Badge & Balance */}
      <div className="flex items-center gap-3">
        {/* Account Mode Badge */}
        <div
          onClick={onOpenSettings}
          className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-90"
        >
          {isDemo ? (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              DEMO MODE
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              LIVE REAL
            </span>
          )}
        </div>

        {/* Balance Display */}
        <div
          onClick={onOpenSettings}
          className="cursor-pointer bg-[#111827] border border-slate-700/80 hover:border-cyan-500/50 rounded-lg px-3 py-1.5 flex flex-col items-end transition-all shadow-sm"
        >
          <span className="text-[10px] text-slate-400 font-medium leading-none">
            {account ? account.loginid : 'NO ACCOUNT'}
          </span>
          <span className="text-sm font-mono font-bold text-white tracking-tight leading-tight mt-0.5">
            {account
              ? `${account.currency} ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : 'Configure Token'}
          </span>
        </div>
      </div>
    </header>
  );
};
