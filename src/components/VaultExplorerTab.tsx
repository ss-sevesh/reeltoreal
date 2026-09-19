import React, { useState } from 'react';
import { FileText, Tag, MapPin, Box, Activity, Clock, ExternalLink, Copy, Check, Trash2, Eye, Code } from 'lucide-react';
import { VaultNote } from '../types';

interface VaultExplorerTabProps {
  notes: VaultNote[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => Promise<void>;
}

export const VaultExplorerTab: React.FC<VaultExplorerTabProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onDeleteNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [deleting, setDeleting] = useState(false);

  const activeNote = notes.find((n) => n.id === selectedNoteId || n.video_id === selectedNoteId) || notes[0];

  const handleCopy = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!activeNote || deleting) return;
    if (confirm(`Are you sure you want to delete note "${activeNote.title}"?`)) {
      setDeleting(true);
      try {
        await onDeleteNote(activeNote.id);
      } finally {
        setDeleting(false);
      }
    }
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
        <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-slate-200">No Obsidian Notes in Vault</h3>
        <p className="text-slate-400 text-sm mt-1">
          Use the Ingest tab to process and index your first reel!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Header & Selector */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mb-1">
            <FileText className="w-4 h-4" />
            <span>Obsidian Knowledge Vault</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Vault Notes Explorer
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Browse and inspect structured `.md` notes stored with YAML frontmatter in <code className="text-purple-300">vault/Notes/</code>
          </p>
        </div>

        {/* Note Selector Dropdown */}
        <div className="sm:w-80">
          <label className="block text-xs font-semibold text-slate-400 mb-1">Select Note:</label>
          <select
            id="vault-note-selector"
            value={activeNote?.id || ''}
            onChange={(e) => onSelectNote(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            {notes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title} ({n.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Note Layout */}
      {activeNote && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-1 h-fit">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note Metadata</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {activeNote.category}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Title:</span>
                <span className="text-slate-100 font-semibold text-sm">{activeNote.title}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Video ID:</span>
                <code className="font-mono text-purple-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {activeNote.video_id}
                </code>
              </div>

              {activeNote.duration_seconds && activeNote.duration_seconds > 0 && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Duration:</span>
                  <span className="text-slate-200 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {activeNote.duration_seconds.toFixed(1)}s
                  </span>
                </div>
              )}

              <div>
                <span className="text-slate-400 block mb-0.5">Source URL:</span>
                <a
                  href={activeNote.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline flex items-center gap-1 break-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{activeNote.source_url}</span>
                </a>
              </div>

              {activeNote.tags.length > 0 && (
                <div>
                  <span className="text-slate-400 block mb-1">Tags:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeNote.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Entities Section */}
              {activeNote.entities && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  {activeNote.entities.objects && activeNote.entities.objects.length > 0 && (
                    <div>
                      <span className="text-slate-400 flex items-center gap-1 mb-1">
                        <Box className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Objects:</span>
                      </span>
                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-300">
                        {activeNote.entities.objects.map((o, i) => (
                          <span key={i} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {o}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeNote.entities.places && activeNote.entities.places.length > 0 && (
                    <div>
                      <span className="text-slate-400 flex items-center gap-1 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>Places:</span>
                      </span>
                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-300">
                        {activeNote.entities.places.map((p, i) => (
                          <span key={i} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeNote.entities.actions && activeNote.entities.actions.length > 0 && (
                    <div>
                      <span className="text-slate-400 flex items-center gap-1 mb-1">
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        <span>Actions:</span>
                      </span>
                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-300">
                        {activeNote.entities.actions.map((a, i) => (
                          <span key={i} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Note Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                title="Delete note from vault"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Note Content Panel */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-slate-400 truncate">{activeNote.fileName}</span>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('formatted')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'formatted'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Formatted</span>
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'raw'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Raw Markdown</span>
                </button>
              </div>
            </div>

            {viewMode === 'raw' ? (
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                {activeNote.rawContent}
              </pre>
            ) : (
              <div className="space-y-6 text-sm text-slate-200 max-h-[600px] overflow-y-auto pr-2">
                {/* Title */}
                <h1 className="text-2xl font-extrabold text-slate-100">{activeNote.title}</h1>

                {/* Summary */}
                {activeNote.summary && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Summary</h2>
                    <p className="p-3 bg-purple-950/20 border-l-2 border-purple-500 rounded-r-lg text-slate-200 leading-relaxed">
                      {activeNote.summary}
                    </p>
                  </div>
                )}

                {/* Transcript */}
                {activeNote.transcript && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-bold text-sky-300 uppercase tracking-wider">Transcript</h2>
                    <div className="space-y-2 font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                      {activeNote.transcript.split('\n').map((line, i) => (
                        <p key={i} className="text-slate-300 leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual Captions */}
                {activeNote.captions && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-bold text-pink-300 uppercase tracking-wider">
                      Visual Scene Descriptions
                    </h2>
                    <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                      {activeNote.captions.split('\n').map((line, i) => {
                        if (!line.trim()) return null;
                        return (
                          <p key={i} className="text-slate-300 leading-relaxed">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
