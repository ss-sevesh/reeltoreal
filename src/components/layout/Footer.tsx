import React from 'react';
import { Film, Code2, Sparkles, Database, Terminal, ShieldCheck } from 'lucide-react';

export const Footer: React.FC<{
  onSelectTab: (tab: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health') => void;
}> = ({ onSelectTab }) => {
  return (
    <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 text-slate-400 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        {/* Col 1: Brand & Philosophy */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Film className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-base font-extrabold text-white">ReelToReal</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              MIT License
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md">
            Turn saved Instagram Reels and YouTube Shorts into an Obsidian-compatible, timestamp-pinpointed local knowledge vault. Fast multimodal ingestion using Whisper STT, Moondream VLM, SQLite FTS5, and Embedded Qdrant.
          </p>
          <div className="flex items-center gap-4 text-xs pt-1 font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Local AI
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-purple-400" /> Embedded Qdrant
            </span>
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-400" /> SQLite FTS5 BM25
            </span>
          </div>
        </div>

        {/* Col 2: Navigation */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Features</h4>
          <ul className="space-y-1.5 text-xs">
            <li>
              <button
                onClick={() => onSelectTab('search')}
                className="hover:text-purple-300 transition cursor-pointer"
              >
                Zero-LLM Hybrid Search
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectTab('chat')}
                className="hover:text-purple-300 transition cursor-pointer"
              >
                Grounded Vault Chat (RAG)
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectTab('ingest')}
                className="hover:text-purple-300 transition cursor-pointer"
              >
                Multimodal Ingest Studio
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectTab('vault')}
                className="hover:text-purple-300 transition cursor-pointer"
              >
                Obsidian Notes Explorer
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectTab('health')}
                className="hover:text-purple-300 transition cursor-pointer"
              >
                Diagnostics & Telemetry
              </button>
            </li>
          </ul>
        </div>

        {/* Col 3: Multimodal Stack */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Technology</h4>
          <ul className="space-y-1.5 text-xs font-mono text-slate-400">
            <li>• faster-whisper (STT)</li>
            <li>• Moondream VLM (Vision)</li>
            <li>• Qdrant + FastEmbed (Vectors)</li>
            <li>• SQLite FTS5 (Lexical BM25)</li>
            <li>• Reciprocal Rank Fusion (RRF)</li>
            <li>• Obsidian Markdown Vault</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} ReelToReal • Built for local video knowledge preservation</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/ss-sevesh/reeltoreal"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
