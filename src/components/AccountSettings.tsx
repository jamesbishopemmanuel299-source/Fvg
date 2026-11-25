import React, { useState } from 'react';
import {
  Settings,
  Shield,
  ShieldAlert,
  Key,
  Server,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Bot,
  Eye,
  EyeOff,
} from 'lucide-react';
import { configureCustomToken } from '../services/api';
import type { DerivConnectionStatus } from '../types/deriv';

interface AccountSettingsProps {
  status: DerivConnectionStatus;
  onStatusUpdated: (status: DerivConnectionStatus) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ status, onStatusUpdated }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const account = status.account;
  const isDemo = status.mode === 'demo';

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const updatedStatus = await configureCustomToken(tokenInput.trim());
      onStatusUpdated(updatedStatus);
      setTokenInput('');
      setFeedback({
        success: true,
        message: `Successfully authenticated with Deriv! Account: ${updatedStatus.account?.loginid || 'Authorized'} (${updatedStatus.mode.toUpperCase()})`,
      });
    } catch (e: any) {
      setFeedback({
        success: false,
        message: e.message || 'Failed to authenticate token with Deriv API.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCustomToken = async () => {
    setIsSubmitting(true);
    try {
      const updatedStatus = await configureCustomToken(null);
      onStatusUpdated(updatedStatus);
      setFeedback({
        success: true,
        message: 'Reverted to server-side default credentials.',
      });
    } catch (e: any) {
      setFeedback({
        success: false,
        message: e.message || 'Error resetting token',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="pb-3 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          Account Connection &amp; Deriv Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage Deriv credentials, connection modes, and safety configurations securely.
        </p>
      </div>

      {/* Account Mode Safeguard Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isDemo
            ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
            : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {isDemo ? (
            <Shield className="w-7 h-7 text-amber-400 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-7 h-7 text-emerald-400 flex-shrink-0" />
          )}
          <div>
            <h3 className="font-bold text-sm">
              Currently Trading in {isDemo ? 'DEMO VIRTUAL MODE' : 'LIVE REAL MONEY MODE'}
            </h3>
            <p className="text-xs opacity-85 mt-0.5 leading-relaxed">
              {isDemo
                ? 'All executions are simulated on Deriv Demo balances. Your real capital is protected.'
                : 'Warning: Real money execution active. Ensure risk controls and stop-loss limits are strictly configured.'}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-black/40 border border-white/10 uppercase">
          {account?.is_virtual ? 'Virtual Account' : 'Real Account'}
        </span>
      </div>

      {/* Account Details Card */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-slate-800">
          <Server className="w-4 h-4 text-cyan-400" />
          Connected Account Information
        </h3>

        {account ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">Account Login ID</span>
              <span className="text-white font-bold text-sm">{account.loginid}</span>
            </div>

            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">Current Balance</span>
              <span className="text-emerald-400 font-bold text-sm">
                {account.currency} {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">Currency</span>
              <span className="text-white font-bold text-sm">{account.currency}</span>
            </div>

            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">Token Source</span>
              <span className="text-cyan-300 font-bold text-xs uppercase">
                {status.activeTokenSource === 'env' ? 'Environment Variable (DERIV_ACCESS_TOKEN)' : status.activeTokenSource === 'custom' ? 'Custom Session Token' : 'None'}
              </span>
            </div>

            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">Deriv App ID</span>
              <span className="text-white font-bold text-sm">{status.clientId || '1089'}</span>
            </div>

            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">WebSocket Health</span>
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Connected ({status.pingMs || 0}ms)
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-900/60 rounded-lg text-xs text-amber-400 border border-amber-800/40 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {status.error || 'No Deriv account currently authorized. Enter an API token below to connect.'}
            </span>
          </div>
        )}
      </div>

      {/* Token Configuration Section */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Deriv API Token</h3>
          </div>
          <a
            href="https://app.deriv.com/account/api-token"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Generate Deriv Token <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          You can provide your Deriv API token (requires <strong>Read</strong> and <strong>Trade</strong> scopes). The token is securely sent to your backend server and never saved in client browser cookies, localStorage, or logs.
        </p>

        <form onSubmit={handleSaveToken} className="space-y-3">
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              placeholder="Paste your Deriv API Token (e.g. a1-b2c3d4e5f6...)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-[#12192c] border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !tokenInput.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Connect &amp; Authenticate
            </button>

            {status.activeTokenSource === 'custom' && (
              <button
                type="button"
                onClick={handleClearCustomToken}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Clear Custom Token
              </button>
            )}
          </div>
        </form>

        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs border flex items-center gap-2 ${
              feedback.success
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
            }`}
          >
            {feedback.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* AI Engine Status */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-slate-800">
          <Bot className="w-4 h-4 text-cyan-400" />
          AI Engine &amp; Copilot Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block font-sans">Groq Engine</span>
              <span className="text-white font-bold">GPT-OSS-120B / LLaMA 3.3</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
              Enabled
            </span>
          </div>

          <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block font-sans">Google GenAI</span>
              <span className="text-white font-bold">gemini-4-hydrogen</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              Primary Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
