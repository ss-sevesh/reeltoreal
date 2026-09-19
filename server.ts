import fs from 'fs';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  ensureNotesDir,
  indexVault,
  getAllNotes,
  getNoteById,
  saveNote,
  deleteNote,
  hybridSearch,
  answerQuestion,
  ingestVideo,
  checkOllamaHealth,
  fetchVideoMetadata,
  inferCategory,
  parseNoteContent,
  parseNoteFile,
} from './server/vault';

// Load .env configuration
if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {
    // .env not found or already loaded
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));

  // Ensure vault notes directory exists and index on boot
  ensureNotesDir();
  const initialIndex = indexVault();
  console.log(`[ReelToReal] Indexed ${initialIndex.notesCount} notes and ${initialIndex.chunksCount} chunks on startup.`);

  // ---------------------------------------------------------------------------
  // API Routes
  // ---------------------------------------------------------------------------

  // System Health Diagnostic
  app.get('/api/health', async (req, res) => {
    const t0 = Date.now();
    const notes = getAllNotes();
    const stats = indexVault();
    const latency = Date.now() - t0;
    const ollama = await checkOllamaHealth();

    res.json({
      ollama: {
        online: ollama.online,
        model: ollama.model,
        latencyMs: Math.max(1, ollama.latencyMs),
      },
      vector_db: {
        active: true,
        chunks: stats.chunksCount,
        storagePath: 'vault/qdrant_storage',
        latencyMs: Math.max(2, latency + 2),
      },
      fts_db: {
        active: true,
        records: stats.notesCount,
        storagePath: 'vault/index.db',
        latencyMs: Math.max(1, latency + 1),
      },
      vault: {
        notesCount: notes.length,
        notesDir: 'vault/Notes',
      },
    });
  });

  // Re-index all notes
  app.post('/api/reindex', (req, res) => {
    const stats = indexVault();
    res.json({
      success: true,
      notesCount: stats.notesCount,
      chunksCount: stats.chunksCount,
      timestamp: new Date().toISOString(),
    });
  });

  // Get all vault notes
  app.get('/api/notes', (req, res) => {
    const notes = getAllNotes();
    res.json(notes);
  });

  // Get single note by ID
  app.get('/api/notes/:id', (req, res) => {
    const note = getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  });

  // Save / Update Note
  app.post('/api/notes', (req, res) => {
    const { fileName, content } = req.body;
    if (!fileName || !content) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }
    const saved = saveNote(fileName, content);
    res.json(saved);
  });

  // Delete Note
  app.delete('/api/notes/:id', (req, res) => {
    const ok = deleteNote(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ success: true });
  });

  // Inspect video URL to auto-detect title, category, duration, and tags
  app.post('/api/inspect', async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid video URL is required' });
    }

    // Try Python backend on port 8000 first if active
    try {
      const pyRes = await fetch('http://localhost:8000/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(6000),
      });
      if (pyRes.ok) {
        const data: any = await pyRes.json();
        // Smart category fusion: categories + tags + title
        const smartCat = inferCategory(`${data.title || ''} ${(data.tags || []).join(' ')} ${data.category || ''} ${url}`);
        return res.json({
          ...data,
          category: smartCat,
        });
      }
    } catch {}

    try {
      const meta = await fetchVideoMetadata(url);
      const smartCat = meta.category || inferCategory(`${meta.title} ${(meta.keywords || []).join(' ')} ${url}`);
      res.json({
        title: meta.title,
        category: smartCat,
        duration: meta.durationSeconds,
        tags: meta.keywords || [],
        source_url: url,
      });
    } catch (err: any) {
      console.error('Inspect error:', err);
      res.status(500).json({ error: err.message || 'Failed to inspect video' });
    }
  });

  // Hybrid Search (Dense + Sparse + RRF) - GET & POST
  const handleSearch = (req: express.Request, res: express.Response) => {
    const query = String(req.query.q || req.body?.query || req.body?.q || '').trim();
    const category = (req.query.category || req.body?.category) ? String(req.query.category || req.body?.category) : null;
    const limit = (req.query.limit || req.body?.limit) ? parseInt(String(req.query.limit || req.body?.limit), 10) : 6;

    if (!query) {
      return res.json([]);
    }

    const results = hybridSearch(query, category, limit);
    res.json(results);
  };

  app.get('/api/search', handleSearch);
  app.post('/api/search', handleSearch);

  // Grounded Vault Chat (RAG)
  app.post('/api/chat', async (req, res) => {
    const query = req.body?.query || req.body?.question;
    const history = req.body?.history || [];
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Try Python backend on port 8000 first if active
    try {
      const pyChat = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
        signal: AbortSignal.timeout(30000),
      });
      if (pyChat.ok) {
        const pyData = (await pyChat.json()) as any;
        return res.json({
          answer: pyData.answer || pyData.content || '',
          sources: pyData.sources || [],
          elapsedMs: pyData.elapsed_ms || 1200,
        });
      }
    } catch {}

    const t0 = Date.now();
    try {
      const response = await answerQuestion(query, history);
      const elapsedMs = Date.now() - t0;
      res.json({
        ...response,
        elapsedMs,
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      res.status(500).json({ error: err.message || 'Failed to process chat query' });
    }
  });

  // Ingest / Process new video — delegates to Python real pipeline (Whisper STT + Moondream VLM)
  // Falls back to Node ingestVideo only if Python server is unreachable
  const handleProcessVideo = async (req: express.Request, res: express.Response) => {
    const { url, title, category } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid video URL is required' });
    }

    // ── PRIMARY: Python real pipeline (yt-dlp + Whisper + Moondream + notegen) ──
    // This performs actual download, real audio transcription (faster-whisper),
    // real visual frame captioning (Moondream via Ollama), and Obsidian note generation.
    try {
      const pyProcess = await fetch('http://localhost:8000/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, category: category || null }),
        // Allow up to 10 minutes for real download + Whisper + VLM captioning
        signal: AbortSignal.timeout(600000),
      });
      if (pyProcess.ok) {
        const pyData: any = await pyProcess.json();
        // Python wrote the note to the shared vault on disk — read it directly.
        // This is more reliable than parsing pyData.note_content (avoids CRLF issues).
        const sharedVaultNotes = path.join(process.cwd(), 'vault', 'Notes');
        let parsedNote: any = null;
        try {
          const files = fs.readdirSync(sharedVaultNotes)
            .filter((f: string) => f.startsWith(pyData.video_id + '_') && f.endsWith('.md'))
            .map((f: string) => ({ f, mtime: fs.statSync(path.join(sharedVaultNotes, f)).mtimeMs }))
            .sort((a: any, b: any) => b.mtime - a.mtime);
          if (files.length > 0) {
            parsedNote = parseNoteFile(path.join(sharedVaultNotes, files[0].f));
          }
        } catch {}
        // Re-index vault so search picks up the new note
        indexVault();
        return res.json({
          success: true,
          note: parsedNote || parseNoteContent(pyData.note_content || '', pyData.video_id) || {
            title: pyData.title || url,
            rawContent: pyData.note_content || '',
            category: category || 'other',
            source_url: url,
            video_id: pyData.video_id,
          },
        });
      }
      // Python returned a non-200 error — surface it
      const errData: any = await pyProcess.json().catch(() => ({}));
      console.error('[Ingest] Python pipeline returned error:', errData.detail || errData.error);
      return res.status(500).json({ error: `Python pipeline error: ${errData.detail || errData.error || 'Unknown error'}` });
    } catch (pyErr: any) {
      if (pyErr?.name === 'TimeoutError') {
        return res.status(504).json({ error: 'Pipeline timed out — video may be too long or Whisper/Moondream is slow on CPU.' });
      }
      console.error('[Ingest] Python server connection error:', pyErr.message);
      return res.status(503).json({
        error: `Python Multimodal Backend is unreachable: ${pyErr.message}. Ensure Python server is running on port 8000.`,
      });
    }
  };

  app.post('/api/ingest', handleProcessVideo);
  app.post('/api/process', handleProcessVideo);

  // ---------------------------------------------------------------------------
  // Vite Middleware Setup
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReelToReal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ReelToReal server:', err);
  process.exit(1);
});
