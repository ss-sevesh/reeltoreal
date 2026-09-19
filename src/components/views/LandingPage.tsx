import React, { useState } from 'react';
import {
  Film,
  Search,
  Sparkles,
  Zap,
  ShieldCheck,
  Database,
  Terminal,
  Clock,
  ArrowRight,
  Eye,
  Headphones,
  FileText,
  Layers,
  CheckCircle2,
  Share2,
  Play,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export interface LandingPageProps {
  onNavigateTab: (tab: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health') => void;
  onQuickSearch: (query: string) => void;
  totalNotes: number;
  totalChunks: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateTab,
  onQuickSearch,
  totalNotes,
  totalChunks,
}) => {
  const [demoInput, setDemoInput] = useState('');

  const sampleQueries = [
    { text: 'safari wildlife with long trunks', label: 'Semantic Synonym' },
    { text: 'young man in red jacket smiling', label: 'Visual Scene' },
    { text: 'traditional south indian cuisine idly', label: 'Exact Recipe' },
    { text: 'the great outdoors hiking trail', label: 'Spoken Transcript' },
  ];

  const handleDemoSearch = (q: string) => {
    onQuickSearch(q);
    onNavigateTab('search');
  };

  return (
    <div className="space-y-20 pb-16">
      {/* 1. Hero Section */}
      <section className="relative pt-8 sm:pt-14 pb-12 overflow-hidden text-center">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-purple-600/15 via-indigo-600/10 to-sky-500/15 blur-3xl -z-10 pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {/* Release & Architecture Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">
              100% Local • Zero Cloud APIs • Obsidian Ready
            </span>
          </div>

          {/* Display Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
            Turn saved Reels & Shorts into an{' '}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
              Obsidian Knowledge Vault
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stop losing valuable recipes, travel spots, workouts, and tutorials in bookmark graveyards. ReelToReal transcribes speech with Whisper STT, captions scenes with Moondream VLM, and pinpoints exact video moments in <strong className="text-purple-300 font-semibold">&lt;200ms</strong> using Embedded Qdrant + SQLite FTS5.
          </p>

          {/* Interactive Live Search Teaser Bar */}
          <div className="pt-2 max-w-2xl mx-auto">
            <div className="p-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl shadow-purple-950/30 flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full flex items-center">
                <Search className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDemoSearch(demoInput || 'safari wildlife')}
                  placeholder="Search a concept, scene action, or exact name..."
                  className="w-full bg-transparent pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleDemoSearch(demoInput || 'safari wildlife')}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
                className="w-full sm:w-auto"
              >
                Instant Search
              </Button>
            </div>

            {/* Quick Query Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-400">
              <span className="text-slate-400 font-medium">Try benchmark:</span>
              {sampleQueries.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => handleDemoSearch(sq.text)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:text-purple-200 text-slate-300 transition text-[11px] cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>"{sq.text}"</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary & Secondary Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigateTab('search')}
              icon={<Search className="w-4 h-4" />}
            >
              Open Moment Search
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigateTab('ingest')}
              icon={<Film className="w-4 h-4 text-purple-400" />}
            >
              Ingest New Video
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigateTab('vault')}
              icon={<FileText className="w-4 h-4 text-emerald-400" />}
            >
              Inspect Vault ({totalNotes} Notes)
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Key Architecture Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <Badge variant="purple" size="md">Multimodal Ingestion Pipeline</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            How ReelToReal Decodes Short-Form Video
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Raw MP4 streams are split into audio and visual tracks, processed in parallel by localized neural models, and stored as Obsidian markdown notes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <Card variant="interactive" className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Whisper Speech-to-Text</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Extracts 16kHz mono audio and utilizes <code className="text-purple-300 font-mono">faster-whisper</code> with int8 quantization to generate microsecond timestamped speech segments (e.g. <code className="text-slate-300 font-mono">0.0s → 4.0s</code>).
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-indigo-300 flex items-center justify-between">
              <span>faster-whisper (int8)</span>
              <span>10x Real-time</span>
            </div>
          </Card>

          {/* Pillar 2 */}
          <Card variant="interactive" className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Moondream Visual Captioning</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Samples video keyframes dynamically every 7 seconds, passing images to the <code className="text-purple-300 font-mono">moondream</code> VLM via local Ollama to caption people, facial expressions, background objects, and actions.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-purple-300 flex items-center justify-between">
              <span>moondream (Ollama)</span>
              <span>Frame @ 7s sample</span>
            </div>
          </Card>

          {/* Pillar 3 */}
          <Card variant="interactive" className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Obsidian & Dual Indexing</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Fuses multimodal tracks into clean Markdown files with YAML frontmatter, then synchronously writes to <code className="text-sky-300 font-mono">SQLite FTS5 (BM25)</code> and <code className="text-sky-300 font-mono">Embedded Qdrant (Dense Vectors)</code>.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-sky-300 flex items-center justify-between">
              <span>Reciprocal Rank Fusion</span>
              <span>0% Hallucination</span>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. Benchmark Comparison Matrix */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Badge variant="emerald" size="md">Retrieval Benchmark</Badge>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1.5">
                Keyword (BM25) vs. Vector vs. ReelToReal Hybrid RRF
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Why standard vector databases or keyword search alone fail on short-form social video.
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" /> Sub-200ms latency
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" /> Zero LLM compute cost
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs">
                  <th className="py-3 px-4">Search Query Scenario</th>
                  <th className="py-3 px-4">SQLite FTS5 (BM25)</th>
                  <th className="py-3 px-4">Pure Vector Search (Qdrant)</th>
                  <th className="py-3 px-4 bg-purple-950/20 text-purple-200 border-l border-r border-purple-500/20">
                    ReelToReal Hybrid (RRF)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-normal">
                <tr className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    Exact video ID or title (<code className="text-purple-300 font-mono">jNQXAC9IVRw</code>)
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400">✅ 100% Exact Match</td>
                  <td className="py-3.5 px-4 text-amber-400">⚠️ Approximate distance</td>
                  <td className="py-3.5 px-4 bg-purple-950/20 font-bold text-emerald-300 border-l border-r border-purple-500/20">
                    ✅ Instant Top Hit #1
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    Synonyms & Concepts (<em className="text-slate-300">"safari wildlife with long trunks"</em>)
                  </td>
                  <td className="py-3.5 px-4 text-rose-400">❌ Misses (words not in text)</td>
                  <td className="py-3.5 px-4 text-emerald-400">✅ Matches concept</td>
                  <td className="py-3.5 px-4 bg-purple-950/20 font-bold text-purple-200 border-l border-r border-purple-500/20">
                    ✅ Ranked #1 (Score: 66.5%)
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    Visual Action (<em className="text-slate-300">"man in red jacket smiling"</em>)
                  </td>
                  <td className="py-3.5 px-4 text-rose-400">❌ Zero match in audio</td>
                  <td className="py-3.5 px-4 text-sky-400">✅ Matches visual scene</td>
                  <td className="py-3.5 px-4 bg-purple-950/20 font-bold text-sky-200 border-l border-r border-purple-500/20">
                    ✅ Pinpoints [CAPTION @ 14s]
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    Query Latency & Hardware Overhead
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">⚡ ~2ms</td>
                  <td className="py-3.5 px-4 text-slate-400">⚡ ~10ms</td>
                  <td className="py-3.5 px-4 bg-purple-950/20 font-bold text-emerald-400 border-l border-r border-purple-500/20">
                    ⚡ &lt;200ms (No LLM Delay)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Feature Showcase Bento */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="sky" size="md">Core Product Modules</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Full-Spectrum Video Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            From automated frame extraction to grounded conversational question answering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div
            onClick={() => onNavigateTab('search')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition">
              Moment Search
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Find the exact timestamp where an ingredient is poured or an exercise posture is demonstrated.
            </p>
            <span className="text-xs text-purple-400 flex items-center gap-1 font-semibold pt-1">
              Launch Search <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => onNavigateTab('chat')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-pink-500/50 transition cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-pink-300 transition">
              Vault Chat (RAG)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask natural language questions synthesized strictly from your saved videos, citing exact titles and reels.
            </p>
            <span className="text-xs text-pink-400 flex items-center gap-1 font-semibold pt-1">
              Start Chatting <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => onNavigateTab('ingest')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition">
              <Film className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-sky-300 transition">
              Ingest Studio
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste any Instagram Reel or YouTube Shorts URL to trigger live transcription, visual captioning, and indexing.
            </p>
            <span className="text-xs text-sky-400 flex items-center gap-1 font-semibold pt-1">
              Ingest Video <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Card 4 */}
          <div
            onClick={() => onNavigateTab('vault')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
              Obsidian Vault
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Native Markdown notes with YAML metadata, extracted entity tags (places, objects, actions), and export tools.
            </p>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold pt-1">
              Browse Notes <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="slate" size="md">FAQ</Badge>
          <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              Can I open and edit these notes inside Obsidian?
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-6">
              Yes! Every note generated by ReelToReal lives directly in the <code className="text-purple-300 font-mono">vault/Notes/</code> directory. You can point your Obsidian app to the vault folder and immediately view formatted frontmatter tags, backlinks, summaries, and timestamped transcripts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              Why is search zero-LLM?
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-6">
              Unlike traditional RAG systems that query heavy LLMs on every single search, ReelToReal pre-computes dense vector embeddings (<code className="text-purple-300 font-mono">FastEmbed</code>) and lexical inverted indices (<code className="text-purple-300 font-mono">SQLite FTS5</code>) during ingestion. Search queries run directly against those indexes using Reciprocal Rank Fusion in under 200ms.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              What video formats and platforms are supported?
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-6">
              ReelToReal is designed for Instagram Reels, YouTube Shorts, TikTok, and standard web MP4 streams. It automatically detects video ID patterns and parses audio and video frames.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Final Call to Action */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/20 text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Start Pinpointing Moments in Your Saved Videos
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Experience sub-second retrieval across multimodal transcripts, visual descriptions, and structured metadata.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigateTab('search')}
              icon={<Search className="w-4 h-4" />}
            >
              Launch Hybrid Search
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigateTab('ingest')}
              icon={<Film className="w-4 h-4" />}
            >
              Ingest a Reel
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
