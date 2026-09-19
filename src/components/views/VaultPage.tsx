import React, { useState } from 'react';
import {
  FileText,
  Tag,
  MapPin,
  Box,
  Activity,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Eye,
  Code,
  Download,
  Edit3,
  Save,
  Search,
  Plus,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { VaultNote } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SearchInput } from '../ui/SearchInput';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { EmptyState } from '../ui/EmptyState';

export interface VaultPageProps {
  notes: VaultNote[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => Promise<void>;
  onSaveNote: (fileName: string, content: string) => Promise<void>;
  onNavigateTab: (tab: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health') => void;
}

export const VaultPage: React.FC<VaultPageProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onDeleteNote,
  onSaveNote,
  onNavigateTab,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewLayout, setViewLayout] = useState<'split' | 'grid'>('split');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw' | 'edit'>('formatted');
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();

  const activeNote =
    notes.find((n) => n.id === selectedNoteId || n.video_id === selectedNoteId) ||
    notes[0];

  const categories = ['All', ...Array.from(new Set(notes.map((n) => n.category)))];

  const filteredNotes = notes.filter((n) => {
    const matchesCat = selectedCategory === 'All' || n.category === selectedCategory;
    const q = filterQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.fileName.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q)) ||
      n.summary.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const handleStartEdit = () => {
    if (!activeNote) return;
    setEditContent(activeNote.rawContent);
    setViewMode('edit');
  };

  const handleSaveEdit = async () => {
    if (!activeNote) return;
    setIsSaving(true);
    try {
      await onSaveNote(activeNote.fileName, editContent);
      setViewMode('formatted');
      toast.success('Note Saved', `${activeNote.fileName} synchronized to vault`);
    } catch (err: any) {
      toast.error('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.rawContent);
    setCopied(true);
    toast.success('Copied to clipboard', 'Obsidian markdown copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.rawContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeNote.fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded note', activeNote.fileName);
  };

  const handleDeleteConfirmed = async () => {
    if (!activeNote) return;
    setIsDeleting(true);
    try {
      await onDeleteNote(activeNote.id);
      setDeleteConfirmOpen(false);
      toast.success('Note Deleted', `Removed ${activeNote.fileName} from vault`);
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<FileText className="w-8 h-8 text-slate-500" />}
          title="No Obsidian Notes in Vault"
          description="Your knowledge vault is currently empty. Ingest an Instagram Reel or YouTube Short to automatically extract spoken transcripts and visual scene captions."
          action={{
            label: 'Ingest First Video',
            onClick: () => onNavigateTab('ingest'),
            icon: <Plus className="w-4 h-4" />,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Obsidian Knowledge Vault</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Vault Notes Explorer
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Browse, edit, and export native markdown notes with YAML frontmatter from{' '}
            <code className="text-purple-300 font-mono text-xs">vault/Notes/*.md</code>
          </p>
        </div>

        {/* View Layout Controls */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewLayout('split')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewLayout === 'split' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Split View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewLayout === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigateTab('ingest')}
            icon={<Plus className="w-4 h-4" />}
          >
            New Reel
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={filterQuery}
            onChange={setFilterQuery}
            onClear={() => setFilterQuery('')}
            placeholder="Filter vault notes..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout Mode */}
      {viewLayout === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onSelectNote(n.id);
                setViewLayout('split');
              }}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition cursor-pointer group flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="purple" size="sm">
                    {n.category}
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-400">
                    {n.duration_seconds ? `${n.duration_seconds}s` : 'Video'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition line-clamp-1">
                  {n.title}
                </h3>
                {n.summary && (
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {n.summary}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px] truncate max-w-[150px]">{n.fileName}</span>
                <span className="text-purple-400 font-semibold text-xs group-hover:translate-x-0.5 transition">
                  Open Note →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Split Layout Mode */}
      {viewLayout === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Note List Sidebar (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-3xl p-4 space-y-2 max-h-[750px] overflow-y-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>Vault Notes ({filteredNotes.length})</span>
            </div>

            <div className="space-y-1.5">
              {filteredNotes.map((n) => {
                const isSelected = activeNote?.id === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      onSelectNote(n.id);
                      setViewMode('formatted');
                    }}
                    className={`w-full p-3 rounded-2xl text-left transition cursor-pointer border flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-100 truncate">{n.title}</span>
                      <Badge variant={isSelected ? 'purple' : 'slate'} size="sm">
                        {n.category}
                      </Badge>
                    </div>
                    {n.summary && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {n.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                      <span>{n.date}</span>
                      <span>ID: {n.video_id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Note Detailed Inspector (8 cols) */}
          {activeNote && (
            <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-6">
              {/* Note Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="purple" size="md">
                      {activeNote.category.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">
                      File: {activeNote.fileName}
                    </span>
                    {activeNote.duration_seconds && (
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        {activeNote.duration_seconds}s
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {activeNote.title}
                  </h3>
                  {activeNote.source_url && (
                    <a
                      href={activeNote.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-mono"
                    >
                      {activeNote.source_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  {viewMode === 'edit' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveEdit}
                      loading={isSaving}
                      icon={<Save className="w-3.5 h-3.5" />}
                    >
                      Save Note
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleStartEdit}
                      icon={<Edit3 className="w-3.5 h-3.5 text-purple-400" />}
                    >
                      Edit Note
                    </Button>
                  )}

                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setViewMode('formatted')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                        viewMode === 'formatted'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Formatted
                    </button>
                    <button
                      onClick={() => setViewMode('raw')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                        viewMode === 'raw'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Raw .md
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownload}
                    icon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteConfirmOpen(true)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* View Mode 1: Edit Mode */}
              {viewMode === 'edit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Editing raw Obsidian Markdown file:</span>
                    <span className="font-mono">{activeNote.fileName}</span>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={18}
                    className="w-full bg-slate-950 border border-purple-500/40 rounded-2xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                  />
                </div>
              )}

              {/* View Mode 2: Raw Markdown Mode */}
              {viewMode === 'raw' && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                  {activeNote.rawContent}
                </div>
              )}

              {/* View Mode 3: Formatted Obsidian Interactive View */}
              {viewMode === 'formatted' && (
                <div className="space-y-6">
                  {/* Extracted Entities Bento */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activeNote.tags.length > 0 ? (
                          activeNote.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-500/20"
                            >
                              #{t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No tags</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
                        <Box className="w-3.5 h-3.5" />
                        <span>VLM Objects</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activeNote.entities?.objects && activeNote.entities.objects.length > 0 ? (
                          activeNote.entities.objects.map((obj, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/40 text-sky-300 border border-sky-500/20"
                            >
                              {obj}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No objects extracted</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Actions & Motion</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activeNote.entities?.actions && activeNote.entities.actions.length > 0 ? (
                          activeNote.entities.actions.map((act, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/20"
                            >
                              {act}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No actions recorded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {activeNote.summary && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Executive Summary
                      </h4>
                      <p className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-slate-200 text-sm leading-relaxed">
                        {activeNote.summary}
                      </p>
                    </div>
                  )}

                  {/* Transcript */}
                  {activeNote.transcript && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                        <span>Audio Transcript (faster-whisper)</span>
                      </h4>
                      <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {activeNote.transcript}
                      </div>
                    </div>
                  )}

                  {/* Visual Scene Descriptions */}
                  {activeNote.captions && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                        <span>Visual Scene Captions (Moondream VLM)</span>
                      </h4>
                      <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {activeNote.captions}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Vault Note?"
        description="This will permanently delete the Markdown file from disk and remove it from vector & lexical indices."
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Are you sure you want to delete <strong className="text-rose-300">{activeNote?.title}</strong> (
            <code className="text-slate-400 font-mono">{activeNote?.fileName}</code>)?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirmed}
              loading={isDeleting}
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
