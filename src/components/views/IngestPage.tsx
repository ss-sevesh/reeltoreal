import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  PlayCircle,
  Sparkles,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Download,
  ExternalLink,
  ArrowRight,
  Headphones,
  Eye,
  Database,
} from 'lucide-react';
import { VaultNote } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';

export interface IngestPageProps {
  onIngestComplete: () => void;
  onOpenNote: (noteId: string) => void;
  onNavigateTab: (tab: 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health') => void;
}

export const IngestPage: React.FC<IngestPageProps> = ({
  onIngestComplete,
  onOpenNote,
  onNavigateTab,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('education');
  const [stage, setStage] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<VaultNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toast = useToast();

  const [urlInputError, setUrlInputError] = useState<string | null>(null);
  const urlInputRef = React.useRef<HTMLInputElement>(null);

  const stages = [
    'Idle',
    '[1/6] Downloading video stream & metadata (yt-dlp)...',
    '[2/6] Extracting 16kHz mono audio & sampling visual frames...',
    '[3/6] Transcribing spoken speech with Whisper STT...',
    '[4/6] Captioning dynamic visual frames with Moondream VLM...',
    '[5/6] Synthesizing structured Obsidian note with LLM Fusion...',
    '[6/6] Updating SQLite FTS5 & Qdrant Vector Databases...',
  ];

  const categories = [
    { value: 'education', label: '📚 Education & Tutorials' },
    { value: 'food', label: '🍜 Food & Cooking' },
    { value: 'travel', label: '✈️ Travel & Scenery' },
    { value: 'animal', label: '🐾 Animals & Wildlife' },
    { value: 'lifestyle', label: '🌿 Lifestyle & Fitness' },
    { value: 'entertainment', label: '🎬 Entertainment & Comedy' },
    { value: 'other', label: '📦 Other / Uncategorized' },
  ];

  const samplePresets = [
    {
      label: 'Elephant Safari Encounter',
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      title: 'Elephants',
      category: 'animal',
    },
    {
      label: 'South Indian Cuisine Chennai',
      url: 'https://www.youtube.com/watch?v=QjZr7gegFWo',
      title: 'Traditional South Indian Cuisine in Chennai',
      category: 'food',
    },
    {
      label: 'The Great Outdoors',
      url: 'https://www.youtube.com/watch?v=dU0Kn1V0UWM',
      title: 'The Great Outdoors',
      category: 'travel',
    },
  ];

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrl(text.trim());
          setUrlInputError(null);
          toast.success('Pasted URL from clipboard');
          return;
        }
      }
    } catch {
      // Clipboard access denied or unsupported
    }
    urlInputRef.current?.focus();
    toast.info('Ready for URL', 'Paste your link using Ctrl+V or Command+V');
  };

  const handleProcess = async () => {
    let cleanUrl = url.trim();

    if (!cleanUrl) {
      setUrlInputError('Please enter or paste a valid video URL first (or choose a preset below)');
      urlInputRef.current?.focus();
      toast.error('URL Required', 'Please paste a YouTube Shorts or Instagram Reel URL to start.');
      return;
    }

    // Auto prepend https:// if missing
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
      setUrl(cleanUrl);
    }

    setUrlInputError(null);
    setIsProcessing(true);
    setError(null);
    setGeneratedNote(null);
    setStage(1);
    setStatusMsg(stages[1]);

    try {
      // Start real backend network request immediately
      const ingestPromise = fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          title: title.trim() || undefined,
          category,
        }),
      });

      // Advance visual telemetry indicators while server processes
      await new Promise((r) => setTimeout(r, 350));
      setStage(2);
      setStatusMsg(stages[2]);

      await new Promise((r) => setTimeout(r, 400));
      setStage(3);
      setStatusMsg(stages[3]);

      await new Promise((r) => setTimeout(r, 450));
      setStage(4);
      setStatusMsg(stages[4]);

      await new Promise((r) => setTimeout(r, 400));
      setStage(5);
      setStatusMsg(stages[5]);

      const res = await ingestPromise;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to ingest video');
      }

      setStage(6);
      setStatusMsg(stages[6]);
      await new Promise((r) => setTimeout(r, 300));

      const data = await res.json();
      setGeneratedNote(data.note);
      setStatusMsg('🎉 Ingestion & Multimodal Indexing Complete!');

      // Confetti celebration burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(
        'Note Ingested Successfully',
        `Generated ${data.note.title} with full Obsidian markdown`
      );
      onIngestComplete();
    } catch (err: any) {
      console.error('Ingest error:', err);
      setError(err.message || 'Pipeline failed');
      toast.error('Ingestion Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const setSampleUrl = (sampleUrl: string, sampleTitle: string, sampleCat: string) => {
    setUrl(sampleUrl);
    setTitle(sampleTitle);
    setCategory(sampleCat);
    setUrlInputError(null);
    toast.info('Preset Loaded', `Loaded "${sampleTitle}". Click "Start Pipeline Ingestion" to process.`);
  };

  const handleCopyNote = () => {
    if (!generatedNote) return;
    navigator.clipboard.writeText(generatedNote.rawContent);
    setCopied(true);
    toast.success('Copied note to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadNote = () => {
    if (!generatedNote) return;
    const blob = new Blob([generatedNote.rawContent], { type: 'text/markdown' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = generatedNote.fileName;
    a.click();
    URL.revokeObjectURL(u);
    toast.success('Downloaded note', generatedNote.fileName);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs mb-1">
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Multimodal Pipeline Ingestion Studio</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
          Ingest Short-Form Video into Knowledge Vault
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl">
          Provide an Instagram Reel or YouTube Shorts URL. ReelToReal downloads the video, runs Whisper speech transcription, samples keyframes for Moondream VLM visual scene captioning, generates an Obsidian markdown file with YAML frontmatter, and updates both SQLite FTS5 and Qdrant vector databases.
        </p>

        {/* Preset Sample Reels */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Try existing preset:</span>
          {samplePresets.map((p, i) => (
            <button
              key={i}
              onClick={() => setSampleUrl(p.url, p.title, p.category)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-sky-200 text-xs transition cursor-pointer disabled:opacity-50"
            >
              🎬 {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ingest Form & Pipeline Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Ingest Inputs */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-sky-400" />
            <span>Video Parameters</span>
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcess();
            }}
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Video URL (YouTube Shorts or Instagram Reel)
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={isProcessing}
                  className="text-[11px] text-sky-400 hover:text-sky-300 transition flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Paste Clipboard</span>
                </button>
              </div>
              <Input
                ref={urlInputRef}
                placeholder="https://www.youtube.com/shorts/... or https://www.instagram.com/reel/..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlInputError) setUrlInputError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleProcess();
                  }
                }}
                error={urlInputError || undefined}
                disabled={isProcessing}
              />
            </div>

            <Input
              label="Custom Title (Optional)"
              placeholder="Auto-detected if left empty..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleProcess();
                }
              }}
              disabled={isProcessing}
            />

            <Select
              label="Category Classification"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories}
              disabled={isProcessing}
            />

            <div className="pt-2">
              <Button
                id="btn-start-ingestion"
                type="submit"
                variant="primary"
                size="lg"
                onClick={handleProcess}
                disabled={isProcessing}
                loading={isProcessing}
                icon={<Sparkles className="w-4 h-4" />}
                className="w-full"
              >
                {isProcessing ? 'Executing Multimodal Pipeline...' : 'Start Pipeline Ingestion'}
              </Button>
            </div>
          </form>

          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Ingestion Error:</strong> {error}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Pipeline Progress & Telemetry */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                Pipeline Stage Telemetry
              </span>
              {stage > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300">
                  Stage {stage} of 6
                </span>
              )}
            </h3>

            {/* Progress Bar */}
            <div className="mt-4 w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${(stage / 6) * 100}%` }}
              />
            </div>

            {/* Stages Checklist */}
            <div className="mt-5 space-y-2.5 text-xs font-mono">
              {stages.slice(1).map((s, idx) => {
                const stageIndex = idx + 1;
                const isCurrent = stage === stageIndex;
                const isDone = stage > stageIndex || stage === 6;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                        : isDone
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                        : 'bg-transparent border-transparent text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                          {stageIndex}
                        </span>
                      )}
                      <span>{s}</span>
                    </span>
                    {isDone && <span className="text-[10px] text-emerald-400">Done</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Obsidian Notes Destination:</span>
            <code className="text-purple-300 font-mono text-[11px]">vault/Notes/*.md</code>
          </div>
        </div>
      </div>

      {/* Generated Note Showcase */}
      {generatedNote && (
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{generatedNote.title}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>File: {generatedNote.fileName}</span>
                  <span>•</span>
                  <span>Category: {generatedNote.category}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyNote}
                icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy Markdown'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadNote}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download .md
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenNote(generatedNote.video_id)}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                Open in Vault
              </Button>
            </div>
          </div>

          {/* Note Content Display */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {generatedNote.rawContent}
          </div>
        </div>
      )}
    </div>
  );
};
