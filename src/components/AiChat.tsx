import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { sendAiChatMessage, executeBuyOrder } from '../services/api';
import type { AiChatMessage, ActiveSymbol } from '../types/deriv';

interface AiChatProps {
  currentSymbol: string;
  currentPrice?: number;
  autoTradingEnabled?: boolean;
  onTradeExecuted: () => void;
  onStopBot: () => void;
  onStartBot: () => void;
}

export const AiChat: React.FC<AiChatProps> = ({
  currentSymbol,
  currentPrice,
  autoTradingEnabled,
  onTradeExecuted,
  onStopBot,
  onStartBot,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to **BONAGO AI Copilot**.\n\nI am connected to real-time Deriv market feeds and risk controls. You can give me natural-language trading commands or ask for market analysis.\n\nTry asking:\n• *"Analyze Volatility 100 Index"*\n• *"Buy CALL on Volatility 50 for 5 minutes with $1 stake"*\n• *"Show my open positions"*\n• *"What is my profit today?"*\n• *"Stop automatic trading"*',
      timestamp: Date.now(),
      modelUsed: 'bonago-engine',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingTradeId, setExecutingTradeId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const quickPrompts = [
    'Analyze Volatility 100 Index.',
    'Trade Boom 100 with $1 stake.',
    'Buy CALL on Volatility 50 for 5 minutes.',
    'Show my open positions.',
    'What is my profit today?',
    'Stop automatic trading.',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: AiChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check for quick client commands (e.g. stop bot)
      if (text.toLowerCase().includes('stop auto') || text.toLowerCase().includes('stop bot') || text.toLowerCase() === 'stop automatic trading.') {
        onStopBot();
      }

      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const reply = await sendAiChatMessage(text, historyPayload, {
        currentSymbol,
        currentPrice,
        autoTradingEnabled,
      });

      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply.content || 'Analysis complete.',
        timestamp: Date.now(),
        modelUsed: reply.modelUsed || 'AI Engine',
        analysis: reply.analysis,
        tradeActionProposal: reply.tradeActionProposal,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error communicating with AI provider: ${e.message}`,
          timestamp: Date.now(),
          error: e.message,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTrade = async (messageId: string, proposal: NonNullable<AiChatMessage['tradeActionProposal']>) => {
    setExecutingTradeId(messageId);
    try {
      const res = await executeBuyOrder({
        symbol: proposal.symbol,
        contract_type: proposal.contractType,
        amount: proposal.stake,
        duration: proposal.duration,
        duration_unit: proposal.durationUnit,
      });

      if (res.success) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.tradeActionProposal) {
              return {
                ...msg,
                tradeActionProposal: {
                  ...msg.tradeActionProposal,
                  executed: true,
                },
              };
            }
            return msg;
          })
        );
        onTradeExecuted();
      } else {
        alert(`Order failed: ${res.error || 'Execution rejected by Deriv'}`);
      }
    } catch (e: any) {
      alert(`Trade execution error: ${e.message}`);
    } finally {
      setExecutingTradeId(null);
    }
  };

  const handleDismissProposal = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.tradeActionProposal) {
          return {
            ...msg,
            tradeActionProposal: {
              ...msg.tradeActionProposal,
              cancelled: true,
            },
          };
        }
        return msg;
      })
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto p-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              BONAGO AI Copilot
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                Groq GPT-OSS-120B / Gemini 4
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Conversational trading execution, real-time market insights &amp; technical analysis.
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: `reset-${Date.now()}`,
                role: 'assistant',
                content: 'Chat session cleared. How can I assist your trading decisions?',
                timestamp: Date.now(),
              },
            ])
          }
          className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex-shrink-0 flex items-center justify-center mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                    : 'bg-[#0e1424] border border-slate-800 text-slate-200 rounded-bl-none shadow-lg'
                }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {msg.content}
                </div>

                {/* Technical Analysis Card if attached */}
                {msg.analysis && (
                  <div className="mt-3 p-3 rounded-xl bg-[#090d18] border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-cyan-400 font-bold">{msg.analysis.symbol}</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          msg.analysis.recommendation === 'CALL'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : msg.analysis.recommendation === 'PUT'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        Signal: {msg.analysis.recommendation}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">RSI (14)</span>
                        <span className="text-white font-bold">{msg.analysis.rsi?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Momentum</span>
                        <span className="text-cyan-300 font-bold">{msg.analysis.trend}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Confidence</span>
                        <span className="text-emerald-400 font-bold">{msg.analysis.confidence}%</span>
                      </div>
                    </div>

                    {msg.analysis.reasoning && (
                      <ul className="text-[11px] text-slate-400 space-y-1 pt-1 font-sans">
                        {msg.analysis.reasoning.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-cyan-500">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Trade Action Confirmation Card if attached */}
                {msg.tradeActionProposal && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#11192d] border border-cyan-500/40 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        Trade Execution Request
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                        Requires Confirmation
                      </span>
                    </div>

                    <div className="bg-[#090d18] p-2.5 rounded-lg text-xs font-mono grid grid-cols-2 gap-2 border border-slate-800">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Market</span>
                        <span className="text-white font-bold">{msg.tradeActionProposal.symbolName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Direction</span>
                        <span
                          className={`font-bold ${
                            msg.tradeActionProposal.contractType === 'CALL'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {msg.tradeActionProposal.contractType} (Higher)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Stake</span>
                        <span className="text-white font-bold">${msg.tradeActionProposal.stake.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Duration</span>
                        <span className="text-white font-bold">
                          {msg.tradeActionProposal.duration} {msg.tradeActionProposal.durationUnit}
                        </span>
                      </div>
                    </div>

                    {msg.tradeActionProposal.executed ? (
                      <div className="flex items-center gap-2 p-2 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-semibold">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Order Executed Successfully on Deriv!</span>
                      </div>
                    ) : msg.tradeActionProposal.cancelled ? (
                      <div className="p-2 rounded bg-slate-800 text-slate-400 text-xs">
                        Order proposal was dismissed.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDismissProposal(msg.id)}
                          className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmTrade(msg.id, msg.tradeActionProposal!)}
                          disabled={executingTradeId === msg.id}
                          className="flex-2 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          {executingTradeId === msg.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Executing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Confirm &amp; Place Trade</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Model badge and timestamp */}
                <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-500">
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.modelUsed && (
                    <span className="font-mono text-slate-400">{msg.modelUsed}</span>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex-shrink-0 flex items-center justify-center mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 text-slate-400 text-xs pl-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 bg-[#0e1424] px-3 py-2 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>BONAGO AI is analyzing market signals and portfolio data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="py-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-[#101728] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white whitespace-nowrap transition-colors text-[11px]"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Type a trading command (e.g. 'Analyze Volatility 100' or 'Buy CALL with $1 stake')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="w-full bg-[#0e1424] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 shadow-inner"
          />
        </div>

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-950/40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
