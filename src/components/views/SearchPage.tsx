import React, { useState, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  Play,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Filter,
  Clock,
  Eye,
  Headphones,
  Copy,
  Check,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import { SearchResult, VaultNote } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SearchInput } from '../ui/SearchInput';
import { Select } from '../ui/Select';
import { Drawer } from '../ui/Drawer';
import { useToast } from '../ui/Toast';
import { CardSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

export interface SearchPageProps {
  initialQuery?: string;
  onOpenNote: (noteId: string) => void;
  onNavigateTab: (tab: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health') => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery = '',
  onOpenNote,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('All');
  const [limit, setLimit] = useState(8);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<VaultNote | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toast = useToast();

  const categories = [
    { value: 'All', label: 'All Categories' },
    { value: 'animal', label: '🐾 Animal' },
    { value: 'travel', label: '✈️ Travel' },
    { value: 'food', label: '🍜 Food' },
    { value: 'lifestyle', label: '🌿 Lifestyle' },
    { value: 'education', label: '📚 Education' },
    { value: 'entertainment', label: '🎬 Entertainment' },
    { value: 'other', label: '📦 Other' },
  ];

  const benchmarkQueries = [
    { label: 'Long Trunks Concept', query: 'safari wildlife with long trunks' },
    { label: 'Red Jacket Scene', query: 'young man in red jacket smiling' },
    { label: 'South Indian Dosa', query: 'traditional south indian cuisine idly' },
    { label: 'Outdoor Scenic Walk', query: 'the great outdoors hiking trail' },
  ];

  const executeSearch = async (searchQuery: string, catFilter: string, maxResults: number) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setElapsedMs(null);
      return;
    }

    setLoading(true);
    const t0 = performance.now();
    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        limit: String(maxResults),
      });
      if (catFilter !== 'All') {
        params.append('category', catFilter);
      }

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
      setElapsedMs(Math.round((performance.now() - t0) * 10) / 10);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search error', 'Could not complete hybrid search query');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        executeSearch(query, category, limit);
      } else {
        setResults([]);
        setElapsedMs(null);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query, category, limit]);

  const handleOpenNoteDrawer = async (videoId: string) => {
    try {
      const res = await fetch(`/api/notes/${videoId}`);
      if (res.ok) {
        const data: VaultNote = await res.json();
        setPreviewNote(data);
      } else {
        toast.error('Note not found', `Could not find note for ${videoId}`);
      }
    } catch (err) {
      toast.error('Failed to load note');
    }
  };

  const handleCopyCitation = (r: SearchResult) => {
    const citation = `> **Moment Pinpoint**: \`${r.timestamp || r.top_chunk_type}\`\n> "${r.highlight_text}"\n— [${r.title}](${r.source_url})`;
    navigator.clipboard.writeText(citation);
    setCopiedId(r.video_id);
    toast.success('Copied to clipboard', 'Markdown citation copied ready for Obsidian');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero-LLM Hybrid Search Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
              Sub-Second Multimodal Moment Search
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Fuses Qdrant dense vectors with SQLite FTS5 BM25 lexical tokens. Search actions, spoken sentences, or visual moments with zero LLM query overhead.
            </p>
          </div>
          {elapsedMs !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 self-start sm:self-center">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Retrieved in <strong className="text-emerald-300">{elapsedMs}ms</strong>
              </span>
            </div>
          )}
        </div>

        {/* Search Controls */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <SearchInput
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
              placeholder="Search concepts (e.g. 'safari animal'), visual actions, or exact words..."
              shortcutBadge="⌘K"
            />
          </div>
          <div className="sm:col-span-4 flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categories}
                icon={<Filter className="w-3.5 h-3.5" />}
              />
            </div>
            <div className="w-24">
              <Select
                value={String(limit)}
                onChange={(e) => setLimit(Number(e.target.value))}
                options={[
                  { value: '4', label: 'Top 4' },
                  { value: '8', label: 'Top 8' },
                  { value: '16', label: 'Top 16' },
                ]}
                icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              />
            </div>
          </div>
        </div>

        {/* Benchmark Quick Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Benchmarks:</span>
          {benchmarkQueries.map((bq, i) => (
            <button
              key={i}
              onClick={() => setQuery(bq.query)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-slate-300 hover:text-purple-200 text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>{bq.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {/* Results Header Bar */}
        {query.trim() && (
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-semibold text-slate-400">
              Found <strong className="text-slate-200">{results.length}</strong> matching moments for{' '}
              <span className="text-purple-300 font-mono">"{query}"</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
              Dense Vector + Sparse BM25 Fusion (RRF k=60)
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Search Results Cards */}
        {!loading && results.map((r, idx) => {
          const isVideoExpanded = expandedVideo === r.video_id;
          const isYouTube =
            r.source_url.includes('youtube.com') ||
            r.source_url.includes('youtu.be') ||
            /^[a-zA-Z0-9_-]{11}$/.test(r.video_id);

          return (
            <div
              key={`${r.video_id}-${idx}`}
              className="bg-slate-900/80 border border-slate-800/90 hover:border-purple-500/40 rounded-2xl p-5 transition-all duration-200 shadow-sm"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <Badge variant="slate" size="sm">
                      {r.category.toUpperCase()}
                    </Badge>
                    {r.timestamp && (
                      <Badge variant="purple" size="sm">
                        <Clock className="w-3 h-3 mr-1" />
                        {r.timestamp}
                      </Badge>
                    )}
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {r.video_id}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 hover:text-purple-200 transition">
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
                      {r.title}
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </h3>
                </div>

                {/* Score Pills */}
                <div className="flex items-center gap-2 self-start sm:self-center font-mono">
                  <div className="px-2.5 py-1 rounded-xl bg-purple-950/50 border border-purple-500/30 text-xs text-purple-300">
                    Similarity: <strong>{Math.round(r.similarity_score * 1000) / 10}%</strong>
                  </div>
                  <div className="px-2 py-1 rounded-xl bg-slate-800 text-[10px] text-slate-400">
                    RRF: {r.rrf_score.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Matched Moment Text Snippet */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                <div className="mt-0.5 text-slate-400">
                  {r.top_chunk_type === 'caption' ? (
                    <span title="Visual Scene Match">
                      <Eye className="w-4 h-4 text-purple-400" />
                    </span>
                  ) : (
                    <span title="Spoken Transcript Match">
                      <Headphones className="w-4 h-4 text-sky-400" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 font-mono">
                      Matched {r.top_chunk_type === 'caption' ? 'Visual Scene' : 'Spoken Audio'}
                    </span>
                    {r.timestamp && (
                      <span className="text-[10px] font-mono px-1.5 rounded bg-slate-800 text-slate-300">
                        {r.timestamp}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {r.highlight_text}
                  </p>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedVideo(isVideoExpanded ? null : r.video_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isVideoExpanded ? 'Hide Video' : 'Watch Clip'}</span>
                    {isVideoExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleOpenNoteDrawer(r.video_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Inspect Note</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCitation(r)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Copy Markdown quotation"
                  >
                    {copiedId === r.video_id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{copiedId === r.video_id ? 'Copied' : 'Cite'}</span>
                  </button>

                  <button
                    onClick={() => onOpenNote(r.video_id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 hover:border-purple-400 text-purple-300 hover:text-purple-100 transition cursor-pointer font-medium"
                  >
                    <span>Vault View</span>
                  </button>
                </div>
              </div>

              {/* Embedded Video Expander */}
              {isVideoExpanded && (
                <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  {isYouTube ? (
                    <div className="relative aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${r.video_id}?autoplay=0&rel=0`}
                        title={r.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 space-y-2">
                      <p className="text-xs">Direct web video stream for {r.source_url}</p>
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium text-xs transition"
                      >
                        Open Original Reel <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State when no matches */}
        {query.trim() && !loading && results.length === 0 && (
          <EmptyState
            icon={<Search className="w-6 h-6 text-slate-500" />}
            title="No matching moments found"
            description="Try searching for general concepts, visual scenes, or ingesting a new reel in the Ingest tab."
            action={{
              label: 'Ingest Video',
              onClick: () => onNavigateTab('ingest'),
            }}
          />
        )}

        {/* Initial Prompt State */}
        {!query.trim() && (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-3xl p-6 text-slate-400 space-y-3 max-w-xl mx-auto">
            <Sparkles className="w-8 h-8 mx-auto text-purple-400" />
            <h4 className="text-base font-bold text-slate-200">Start Searching Your Video Vault</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Type any word, action, or question in the box above or click any of the benchmark buttons to experience zero-LLM hybrid retrieval.
            </p>
          </div>
        )}
      </div>

      {/* Note Quick Preview Drawer */}
      <Drawer
        isOpen={!!previewNote}
        onClose={() => setPreviewNote(null)}
        title={previewNote?.title}
        subtitle={`ID: ${previewNote?.video_id} • ${previewNote?.category.toUpperCase()}`}
        width="xl"
      >
        {previewNote && (
          <div className="space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <a
                href={previewNote.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:underline flex items-center gap-1"
              >
                {previewNote.source_url} <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-400">{previewNote.fileName}</span>
            </div>

            {previewNote.summary && (
              <div>
                <h5 className="font-bold text-slate-200 mb-1">## Summary</h5>
                <p className="text-slate-300 font-sans leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {previewNote.summary}
                </p>
              </div>
            )}

            <div>
              <h5 className="font-bold text-slate-200 mb-1">## Full Obsidian Note Content</h5>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto">
                {previewNote.rawContent}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const id = previewNote.video_id;
                  setPreviewNote(null);
                  onOpenNote(id);
                }}
              >
                Open in Full Vault Editor
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
