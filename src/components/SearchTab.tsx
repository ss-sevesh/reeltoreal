import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Play, FileText, ChevronDown, ChevronUp, Sparkles, Filter, Clock } from 'lucide-react';
import { SearchResult, VaultNote } from '../types';

interface SearchTabProps {
  onOpenNote: (noteId: string) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({ onOpenNote }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [notePreview, setNotePreview] = useState<{ id: string; content: string } | null>(null);

  const categories = ['All', 'animal', 'travel', 'food', 'lifestyle', 'education', 'entertainment', 'other'];

  const executeSearch = async (searchQuery: string, catFilter: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setElapsedMs(null);
      return;
    }

    setLoading(true);
    const t0 = performance.now();
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: catFilter,
        limit: '8',
      });
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
      setElapsedMs(Math.round((performance.now() - t0) * 10) / 10);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        executeSearch(query, category);
      } else {
        setResults([]);
        setElapsedMs(null);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, category]);

  const handleChipClick = (promptText: string) => {
    setQuery(promptText);
  };

  const handleToggleNote = async (videoId: string) => {
    if (notePreview?.id === videoId) {
      setNotePreview(null);
      return;
    }
    try {
      const res = await fetch(`/api/notes/${videoId}`);
      if (res.ok) {
        const data: VaultNote = await res.json();
        setNotePreview({ id: videoId, content: data.rawContent });
      }
    } catch (err) {
      console.error('Failed to load note preview:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Zero-LLM Hybrid Search</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
          Sub-Second Multimodal Moment Search
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Fuses dense semantic vectors (Qdrant) and exact keyword lexical matching (SQLite FTS5) with Reciprocal Rank Fusion (RRF) to pinpoint exact spoken and visual moments in under 200ms.
        </p>

        {/* Search Inputs */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3 relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. safari animals with long trunks, young man smiling at fence, outdoor hiking..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-sm transition"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              id="category-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition appearance-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Benchmark / Try Searching Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400 font-medium">Try searching:</span>
          <button
            onClick={() => handleChipClick('safari animals with long trunks')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/40 text-purple-200 border border-purple-500/20 transition cursor-pointer"
          >
            🐘 Safari Animals
          </button>
          <button
            onClick={() => handleChipClick('smiling guy standing near fence')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/40 text-purple-200 border border-purple-500/20 transition cursor-pointer"
          >
            😊 Guy Smiling Near Fence
          </button>
          <button
            onClick={() => handleChipClick('outdoor adventure hiking and scenic views')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/40 text-purple-200 border border-purple-500/20 transition cursor-pointer"
          >
            🏔️ Outdoor Adventure
          </button>
          <button
            onClick={() => handleChipClick('wearing a red jacket and blue shirt')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/40 text-purple-200 border border-purple-500/20 transition cursor-pointer"
          >
            🧥 Red & Blue Jacket
          </button>
          <button
            onClick={() => handleChipClick('traditional south indian cuisine idly vada')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/40 text-purple-200 border border-purple-500/20 transition cursor-pointer"
          >
            🍛 South Indian Food
          </button>
        </div>
      </div>

      {/* Search Meta Status */}
      {query.trim() && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span>
              Found <strong className="text-purple-300 font-semibold">{results.length}</strong> matching reel(s)
            </span>
            {elapsedMs !== null && (
              <span className="font-mono bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                ⚡ {elapsedMs}ms (no LLM delay)
              </span>
            )}
          </div>
          {loading && <span className="text-purple-400 animate-pulse">Searching vector chunks...</span>}
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {results.map((r) => {
          const isVideoExpanded = expandedVideo === r.video_id;
          const isNoteExpanded = notePreview?.id === r.video_id;
          const isYouTube = r.source_url.includes('youtube.com') || r.source_url.includes('youtu.be');

          return (
            <div
              key={r.video_id}
              className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 transition-all shadow-md"
            >
              {/* Card Header: Title, Category & Score */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-100">{r.title}</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {r.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Match:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    {(r.similarity_score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Moment Pill */}
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-mono font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {r.top_chunk_type.toUpperCase()}
                    {r.timestamp ? ` @ ${r.timestamp}` : ''}
                  </span>
                </span>
              </div>

              {/* Highlight Excerpt */}
              <blockquote className="my-3 pl-3.5 border-l-2 border-purple-500 text-sm text-slate-300 leading-relaxed font-sans bg-slate-950/40 py-2 pr-3 rounded-r-lg">
                {r.highlight_text}
              </blockquote>

              {/* Card Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-800/80 text-xs">
                {/* Source Link */}
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 hover:underline font-mono truncate max-w-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{r.source_url}</span>
                </a>

                {/* Video & Note Preview Toggles */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedVideo(isVideoExpanded ? null : r.video_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isVideoExpanded ? 'Hide Video' : 'Watch Clip'}</span>
                    {isVideoExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleToggleNote(r.video_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isNoteExpanded ? 'Hide Note' : 'Obsidian Note'}</span>
                    {isNoteExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Video Player Expander */}
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
                    <div className="text-center py-6 text-slate-400">
                      <p>Web video playback for {r.source_url}:</p>
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-xs transition"
                      >
                        Open Original Reel <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Obsidian Markdown Note Expander */}
              {isNoteExpanded && notePreview && (
                <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-purple-500/20 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {notePreview.content}
                </div>
              )}
            </div>
          );
        })}

        {query.trim() && !loading && results.length === 0 && (
          <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800/80">
            <Search className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-slate-300 font-medium">No matching moments found</p>
            <p className="text-slate-500 text-xs mt-1">
              Try searching different keywords, selecting &quot;All Categories&quot;, or ingesting a new reel in the Ingest tab.
            </p>
          </div>
        )}

        {!query.trim() && (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
            Type in the search bar or click any of the prompt chips above to test instant hybrid retrieval.
          </div>
        )}
      </div>
    </div>
  );
};
