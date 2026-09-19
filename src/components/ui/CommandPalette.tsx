import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Sparkles,
  MessageSquare,
  UploadCloud,
  BookOpen,
  Activity,
  FileText,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Command,
} from 'lucide-react';
import { VaultNote } from '../../types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: VaultNote[];
  onNavigateTab: (tab: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health') => void;
  onSelectNote: (noteId: string) => void;
  onQuickSearch: (query: string) => void;
  onReindex: () => Promise<void>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  onNavigateTab,
  onSelectNote,
  onQuickSearch,
  onReindex,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  // Filter notes
  const matchedNotes = notes.filter((n) => {
    if (!normalizedQuery) return true;
    return (
      n.title.toLowerCase().includes(normalizedQuery) ||
      n.category.toLowerCase().includes(normalizedQuery) ||
      n.tags.some((t) => t.toLowerCase().includes(normalizedQuery))
    );
  }).slice(0, 5);

  const sampleQueries = [
    'safari animals with long trunks',
    'smiling guy standing near fence',
    'traditional south indian cuisine idly vada',
    'outdoor adventure hiking and scenic views',
  ].filter((q) => !normalizedQuery || q.includes(normalizedQuery));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-purple-950/40 overflow-hidden z-10"
        >
          {/* Top Search Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-800">
            <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command, search notes, or jump to a tab..."
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
            />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              ESC
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-3 space-y-4">
            {/* Quick Actions / Navigation */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                Quick Navigation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                <button
                  onClick={() => {
                    onNavigateTab('search');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <Search className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">Hybrid Moment Search</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('chat');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-pink-400" />
                  <span className="font-medium">Vault Chat & RAG</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('ingest');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-sky-400" />
                  <span className="font-medium">Ingest New Reel/Short</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('vault');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">Obsidian Vault Explorer</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('health');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span className="font-medium">Pipeline Health Diagnostic</span>
                </button>
                <button
                  onClick={async () => {
                    await onReindex();
                    onClose();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium">Rebuild Vector & FTS Index</span>
                </button>
              </div>
            </div>

            {/* Matching Obsidian Notes */}
            {matchedNotes.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                  Obsidian Vault Notes
                </div>
                <div className="space-y-1">
                  {matchedNotes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        onSelectNote(n.id);
                        onNavigateTab('vault');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-200 hover:bg-purple-950/30 hover:border-purple-500/30 border border-transparent transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-slate-100 group-hover:text-purple-300">
                            {n.title}
                          </span>
                          <span className="ml-2 text-[10px] text-slate-500 font-mono">
                            {n.fileName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono flex-shrink-0">
                        {n.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Test Queries */}
            {sampleQueries.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                  Sub-Second Hybrid Searches
                </div>
                <div className="space-y-1">
                  {sampleQueries.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onQuickSearch(q);
                        onNavigateTab('search');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition text-left cursor-pointer text-xs group"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span className="group-hover:text-sky-300 font-medium">"{q}"</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Command className="w-3 h-3" />
              <span>Use arrow keys or click to select</span>
            </span>
            <span>Zero-LLM Hybrid Search • 100% Local</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
