import React, { useState } from 'react';
import {
  Film,
  Search,
  MessageSquare,
  UploadCloud,
  BookOpen,
  Activity,
  Command,
  Menu,
  X,
  Plus,
  Cpu,
  Database,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { HealthStats } from '../../types';
import { Button } from '../ui/Button';

export interface NavbarProps {
  activeTab: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health';
  onSelectTab: (tab: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health') => void;
  stats: HealthStats | null;
  onOpenCommandPalette: () => void;
  onQuickIngest: () => void;
  onReindex: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  stats,
  onOpenCommandPalette,
  onQuickIngest,
  onReindex,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

  const navItems: Array<{
    id: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'landing', label: 'Overview', icon: Sparkles },
    { id: 'search', label: 'Moment Search', icon: Search, badge: '<200ms' },
    { id: 'chat', label: 'Vault Chat', icon: MessageSquare },
    { id: 'ingest', label: 'Ingest Studio', icon: UploadCloud },
    { id: 'vault', label: 'Knowledge Vault', icon: BookOpen },
    { id: 'health', label: 'Diagnostics', icon: Activity },
  ];

  const handleReindexClick = async () => {
    setIsReindexing(true);
    try {
      await onReindex();
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => onSelectTab('landing')}
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-400 p-[1.5px] shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-purple-200 transition-colors">
                ReelToReal
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium hidden sm:inline-block">
                v1.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline-block -mt-0.5">
              Multimodal Knowledge Vault
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'text-white bg-purple-600/90 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-200 border border-purple-400/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Controls & Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick ⌘K Button */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer"
            title="Search knowledge vault (⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Quick Jump</span>
            <kbd className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* Quick Engine Status Indicator */}
          <div
            onClick={() => onSelectTab('health')}
            className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono cursor-pointer hover:border-slate-700 transition"
            title="System status • Click to inspect diagnostics"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              Qdrant: <strong className="text-purple-300">{stats?.vector_db.chunks ?? 0}</strong> chunks
            </span>
          </div>

          {/* Reindex Button */}
          <button
            onClick={handleReindexClick}
            disabled={isReindexing}
            title="Re-run lexical and vector indexing"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isReindexing ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          {/* Primary CTA: Ingest Reel */}
          <Button
            size="sm"
            variant="primary"
            onClick={onQuickIngest}
            icon={<Plus className="w-4 h-4" />}
            className="hidden sm:inline-flex"
          >
            Ingest Video
          </Button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-3 rounded-xl text-left font-semibold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onQuickIngest();
                setMobileMenuOpen(false);
              }}
              icon={<Plus className="w-4 h-4" />}
              className="w-full"
            >
              Ingest New Video
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onOpenCommandPalette();
                setMobileMenuOpen(false);
              }}
              icon={<Search className="w-4 h-4" />}
              className="w-full"
            >
              Quick Search (⌘K)
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
