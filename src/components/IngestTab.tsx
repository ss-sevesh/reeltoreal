import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { UploadCloud, CheckCircle2, Loader2, PlayCircle, Sparkles, FileText, AlertTriangle } from 'lucide-react';
import { VaultNote } from '../types';

interface IngestTabProps {
  onIngestComplete: () => void;
}

export const IngestTab: React.FC<IngestTabProps> = ({ onIngestComplete }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('education');
  const [stage, setStage] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<VaultNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stages = [
    'Idle',
    '[1/6] Downloading video stream & metadata (yt-dlp)...',
    '[2/6] Extracting 16kHz mono audio & sampling visual frames...',
    '[3/6] Transcribing spoken speech with Whisper STT...',
    '[4/6] Captioning dynamic visual frames with Moondream VLM...',
    '[5/6] Synthesizing structured Obsidian note with LLM Fusion...',
    '[6/6] Updating SQLite FTS5 & Qdrant Vector Databases...',
  ];

  const handleProcess = async () => {
    let cleanUrl = url.trim();
    if (!cleanUrl) {
      setError('Please provide a video URL before starting ingestion.');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
      setUrl(cleanUrl);
    }

    setIsProcessing(true);
    setError(null);
    setGeneratedNote(null);
    setStage(1);
    setStatusMsg(stages[1]);

    try {
      const ingestPromise = fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          title: title.trim() || undefined,
          category,
        }),
      });

      // Realistic dynamic stage progression matching real pipeline runtimes
      const stageTimers: NodeJS.Timeout[] = [];
      stageTimers.push(setTimeout(() => {
        setStage(2);
        setStatusMsg(stages[2]);
      }, 3500));

      stageTimers.push(setTimeout(() => {
        setStage(3);
        setStatusMsg(stages[3]);
      }, 8000));

      stageTimers.push(setTimeout(() => {
        setStage(4);
        setStatusMsg('[4/6] Captioning visual frames with Moondream VLM (analyzing scene keyframes)...');
      }, 18000));

      stageTimers.push(setTimeout(() => {
        setStatusMsg('[4/6] Still captioning keyframes with Moondream VLM (deep visual perception)...');
      }, 32000));

      const res = await ingestPromise;
      stageTimers.forEach(t => clearTimeout(t));

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to ingest video');
      }

      setStage(5);
      setStatusMsg(stages[5]);
      await new Promise((r) => setTimeout(r, 300));

      setStage(6);
      setStatusMsg(stages[6]);
      await new Promise((r) => setTimeout(r, 250));

      const data = await res.json();
      setGeneratedNote(data.note);
      setStatusMsg('🎉 Ingestion & Multimodal Indexing Complete!');

      // Confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      onIngestComplete();
    } catch (err: any) {
      console.error('Ingest error:', err);
      setError(err.message || 'Pipeline failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const setSampleUrl = (sampleUrl: string, sampleTitle: string, sampleCat: string) => {
    setUrl(sampleUrl);
    setTitle(sampleTitle);
    setCategory(sampleCat);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm mb-1">
          <UploadCloud className="w-4 h-4" />
          <span>Multimodal Pipeline Ingestion</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
          Ingest New Video into Vault
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Paste an Instagram Reel or YouTube Short URL to run the complete 6-stage multimodal perception pipeline: download, audio extraction, Whisper STT, Moondream VLM frame captioning, and dual-engine indexing.
        </p>

        {/* Input Form */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Video URL (YouTube Shorts or Instagram Reel)
            </label>
            <input
              id="ingest-url-input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
              placeholder="https://www.youtube.com/shorts/... or https://www.instagram.com/reel/..."
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 font-mono transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Note Title (Optional)
              </label>
              <input
                id="ingest-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
                placeholder="e.g. Masterclass on Sourdough Bread"
                disabled={isProcessing}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <select
                id="ingest-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isProcessing}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <option value="education">Education</option>
                <option value="food">Food & Cooking</option>
                <option value="travel">Travel & Outdoors</option>
                <option value="animal">Animals & Nature</option>
                <option value="lifestyle">Fitness & Lifestyle</option>
                <option value="entertainment">Entertainment</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Quick Sample Links */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="text-slate-400 font-medium">Quick sample reels:</span>
            <button
              type="button"
              onClick={() =>
                setSampleUrl(
                  'https://youtube.com/shorts/QjZr7gegFWo',
                  'Traditional South Indian Cuisine in Chennai',
                  'food'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition cursor-pointer"
            >
              🍲 Janal Khadai Street Food
            </button>
            <button
              type="button"
              onClick={() =>
                setSampleUrl(
                  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
                  'Elephants Zoo Interaction',
                  'animal'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition cursor-pointer"
            >
              🐘 Elephants at Zoo
            </button>
            <button
              type="button"
              onClick={() =>
                setSampleUrl(
                  'https://www.youtube.com/watch?v=dU0Kn1V0UWM',
                  'The Great Outdoors Trek',
                  'travel'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition cursor-pointer"
            >
              🏔️ Great Outdoors Trek
            </button>
          </div>

          {/* Submit CTA */}
          <button
            id="btn-process-video"
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-lg shadow-sky-500/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>Process Video & Add to Vault</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress & Feedback State */}
      {isProcessing && (
        <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-sky-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              {statusMsg}
            </span>
            <span className="font-mono text-xs text-slate-400">{Math.round((stage / 6) * 100)}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(stage / 6) * 100}%` }}
            />
          </div>

          {/* Step Timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2">
            {stages.slice(1).map((s, idx) => {
              const currentStep = idx + 1;
              const isDone = stage > currentStep;
              const isCurrent = stage === currentStep;
              return (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-[11px] font-mono flex items-center gap-2 ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : isCurrent
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 animate-pulse'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                  <span className="truncate">{s.replace(/^\[[0-9/]+\]\s*/, '')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Output Generated Note */}
      {generatedNote && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Obsidian Note Successfully Generated & Indexed</span>
            </div>
            <span className="font-mono text-xs text-slate-400">{generatedNote.fileName}</span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-100">{generatedNote.title}</h3>
            <p className="text-slate-300 text-xs mt-1">{generatedNote.summary}</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-80 overflow-y-auto whitespace-pre-wrap">
            {generatedNote.rawContent}
          </div>
        </div>
      )}
    </div>
  );
};
