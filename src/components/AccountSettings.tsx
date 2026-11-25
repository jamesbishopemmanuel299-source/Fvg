import React, { useEffect, useState } from 'react';
import {
  Settings, Shield, ShieldAlert, Server, CheckCircle, AlertTriangle,
  RefreshCw, ExternalLink, Bot
} from 'lucide-react';
import { reconnectDeriv } from '../services/api';
import type { DerivConnectionStatus } from '../types/deriv';

interface AccountSettingsProps {
  status: DerivConnectionStatus;
  onStatusUpdated: (status: DerivConnectionStatus) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ status, onStatusUpdated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);

  const refreshConfigStatus = async () => {
    try {
      const response = await fetch('/api/system/config-status');
      if (response.ok) setConfigStatus(await response.json());
    } catch { /* Keep the settings screen usable if status is temporarily unavailable. */ }
  };

  useEffect(() => { refreshConfigStatus(); }, []);
  const account = status.account;
  const connected = Boolean(status.connected && status.authorized && account);
  const isDemo = Boolean(account?.is_virtual);

  const handleReconnect = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const updated = await reconnectDeriv();
      onStatusUpdated(updated);
      await refreshConfigStatus();
      setFeedback({
        success: true,
        message: `Connected to Deriv ${updated.mode.toUpperCase()} account ${updated.account?.loginid || ''}.`,
      });
    } catch (error: any) {
      setFeedback({ success: false, message: error.message || 'Could not connect to Deriv.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5">
      <div className="pb-3 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" /> Deriv Account Connection
        </h2>
        <p className="text-xs text-slate-400 mt-1">Secure server-side connection using your private Render environment variables.</p>
      </div>

      <div className={`p-4 rounded-xl border flex items-center gap-3 ${connected ? (isDemo ? 'bg-amber-950/20 border-amber-500/40' : 'bg-emerald-950/20 border-emerald-500/40') : 'bg-rose-950/20 border-rose-500/40'}`}>
        {connected ? (isDemo ? <Shield className="w-7 h-7 text-amber-400" /> : <ShieldAlert className="w-7 h-7 text-emerald-400" />) : <AlertTriangle className="w-7 h-7 text-rose-400" />}
        <div>
          <h3 className="font-bold text-sm text-white">{connected ? `DERIV ${isDemo ? 'DEMO' : 'LIVE'} ACCOUNT CONNECTED` : 'DERIV ACCOUNT NOT CONNECTED'}</h3>
          <p className="text-xs text-slate-400 mt-1">{connected ? 'Account data is being read from Deriv.' : (status.error || 'Add your Deriv credentials to Render, then reconnect.')}</p>
        </div>
      </div>

      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-slate-800">
          <Server className="w-4 h-4 text-cyan-400" /> Live Account Information
        </h3>
        {account && connected ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800"><span className="text-slate-500 block mb-1">Login ID</span><strong className="text-white text-sm">{account.loginid}</strong></div>
            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800"><span className="text-slate-500 block mb-1">Live Balance</span><strong className="text-emerald-400 text-sm">{account.currency} {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800"><span className="text-slate-500 block mb-1">Account Type</span><strong className="text-white text-sm">{isDemo ? 'DEMO / VIRTUAL' : 'LIVE / REAL'}</strong></div>
            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800"><span className="text-slate-500 block mb-1">Currency</span><strong className="text-white text-sm">{account.currency}</strong></div>
            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800"><span className="text-slate-500 block mb-1">Token Source</span><strong className="text-cyan-300 text-xs">RENDER ENVIRONMENT</strong></div>
            <div className="p-3 bg-[#0a0f1c] rounded-lg border border-slate-800"><span className="text-slate-500 block mb-1">WebSocket</span><strong className="text-emerald-400 text-xs">CONNECTED · {status.pingMs || 0}ms</strong></div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">No account details are shown until Deriv confirms authorization. BONAGO will not display a made-up demo balance.</p>
        )}
      </div>

      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-white text-sm">Connect through Render (recommended)</h3>
        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
          <li>Open your <a className="text-cyan-400 underline" href="https://dashboard.render.com/" target="_blank" rel="noreferrer">Render Dashboard</a> and select the service for this app.</li>
          <li>Open <strong>Environment</strong> and add <code className="text-cyan-300">DERIV_ACCESS_TOKEN</code> with your Deriv demo API token.</li>
          <li>Set <code className="text-cyan-300">DERIV_APP_ID</code> to your Deriv app's numeric App ID. Do not use your account login ID here.</li>
          <li>Save changes and redeploy the service.</li>
          <li>Return here and press Reconnect.</li>
        </ol>
        <p className="text-xs text-amber-300">Create a token with Read and Trade permissions for demo trading. Keep the token private; never paste it into this page, GitHub, or chat. Do not add a real-account token while testing.</p>
        <div className="flex flex-wrap gap-3">
          <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border border-slate-700 text-cyan-300 text-xs flex items-center gap-2">Create Deriv API Token <ExternalLink className="w-3 h-3" /></a>
          <button onClick={handleReconnect} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2">
            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Reconnect to Deriv
          </button>
        </div>
        {feedback && <div className={`p-3 rounded-lg text-xs border flex items-center gap-2 ${feedback.success ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' : 'bg-rose-950/70 border-rose-500/50 text-rose-300'}`}>
          {feedback.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {feedback.message}
        </div>}
      </div>

      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm">Server Environment Configuration</h3>
        <p className="text-xs text-slate-400">BONAGO reads these settings from Render's private environment. Secret values are never sent to the browser.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            ['DERIV_APP_ID', configStatus?.derivAppIdConfigured],
            ['DERIV_CLIENT_ID (optional)', configStatus?.derivClientIdConfigured],
            ['DERIV_ACCESS_TOKEN', configStatus?.derivAccessTokenConfigured],
            ['GROQ_API_KEY', configStatus?.groqApiKeyConfigured],
          ].map(([name, ready]) => (
            <div key={String(name)} className="flex items-center justify-between gap-2 rounded-lg bg-[#0a0f1c] border border-slate-800 p-3">
              <code className="text-cyan-300">{name}</code>
              <span className={ready ? 'text-emerald-400' : 'text-rose-300'}>{ready ? 'CONFIGURED' : 'MISSING'}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-400">Groq model: <span className="text-cyan-300">{configStatus?.groqModel || 'openai/gpt-oss-120b'}</span></div>
        <button onClick={refreshConfigStatus} className="text-xs text-cyan-300 underline">Refresh configuration status</button>
      </div>

      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-cyan-400" /> Trading Safety</h3>
        <p className="text-xs text-slate-400">Automatic trading remains under your control. Connect and verify the DEMO account and balance before enabling any bot. If Deriv authorization fails, order execution is blocked.</p>
      </div>
    </div>
  );
};
