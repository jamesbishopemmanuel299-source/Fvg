import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  Bot,
  Layers,
  History,
  Settings,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'terminal' | 'ai_chat' | 'auto_bot' | 'positions' | 'history' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openPositionsCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openPositionsCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.FC<any>; badge?: number | string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'terminal', label: 'Live Chart & Trade', icon: TrendingUp },
    { id: 'ai_chat', label: 'AI Trading Copilot', icon: MessageSquare, badge: 'AI' },
    { id: 'auto_bot', label: 'Automated Bot', icon: Bot },
    { id: 'positions', label: 'Open Positions', icon: Layers, badge: openPositionsCount > 0 ? openPositionsCount : undefined },
    { id: 'history', label: 'Trade History', icon: History },
    { id: 'settings', label: 'Account & Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-40 w-64 bg-[#090d18] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation Items */}
        <div className="p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      typeof item.badge === 'number'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Safety & Anti-Martingale Note */}
        <div className="p-3 m-3 rounded-xl bg-[#0e1424] border border-slate-800/80">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-semibold">Anti-Martingale Active</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Automatic stake doubling is disabled. Fixed risk management protects capital.
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Deriv WS v3</span>
            <span className="text-emerald-400 font-mono">TLS 1.3</span>
          </div>
        </div>
      </aside>
    </>
  );
};
