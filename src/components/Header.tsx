import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Database, Search, FileText, Cpu } from 'lucide-react';
import { HealthStats } from '../types';

interface HeaderProps {
  stats: HealthStats | null;
  onReindex: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({ stats, onReindex }) => {
  const [reindexing, setReindexing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await onReindex();
      setFeedback('Indexes updated successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback('Failed to re-index');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setReindexing(false);
    }
  };

  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-40 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-sky-400 p-0.5 shadow-lg shadow-purple-500/20 flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-xl">
              🎬
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-sky-400 bg-clip-text text-transparent">
                ReelToReal
              </h1>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                v1.0 Local Vault
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Timestamp-pinpointed, hybrid-searchable knowledge vault for Reels & Shorts
            </p>
          </div>
        </div>

        {/* Health Indicators & Reindex CTA */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* AI Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Cpu className="w-3.5 h-3.5" />
            <span>AI: {stats?.ollama.model.split(':')[0] || 'Ready'}</span>
          </div>

          {/* Qdrant Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <Database className="w-3.5 h-3.5" />
            <span>Qdrant: {stats?.vector_db.chunks ?? '–'} chunks</span>
          </div>

          {/* SQLite FTS5 Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <Search className="w-3.5 h-3.5" />
            <span>FTS5: {stats?.fts_db.records ?? '–'} reels</span>
          </div>

          {/* Reindex Button */}
          <button
            id="btn-reindex-all"
            onClick={handleReindex}
            disabled={reindexing}
            title="Re-run lexical and vector indexing across all vault notes"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin text-purple-400' : ''}`} />
            <span>{reindexing ? 'Rebuilding...' : 'Reindex'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="max-w-7xl mx-auto mt-2 text-xs font-medium text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{feedback}</span>
        </div>
      )}
    </header>
  );
};
