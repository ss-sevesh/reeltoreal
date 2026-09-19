import { VaultNote, SearchResult, ChatMessage, HealthStats } from '../types';

export interface ReindexResponse {
  success: boolean;
  notesCount: number;
  chunksCount: number;
  timestamp: string;
}

export interface IngestResponse {
  success: boolean;
  note: VaultNote;
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    title: string;
    source_url: string;
    category: string;
    video_id: string;
    timestamp?: string;
    excerpt?: string;
  }>;
  elapsedMs: number;
}

/**
 * Centralized API Service for ReelToReal Backend
 */
export const api = {
  /**
   * Fetch system health diagnostics
   */
  async getHealth(): Promise<HealthStats> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  /**
   * Trigger re-indexing of all vault notes
   */
  async reindexVault(): Promise<ReindexResponse> {
    const res = await fetch('/api/reindex', { method: 'POST' });
    if (!res.ok) throw new Error(`Reindex failed: ${res.statusText}`);
    return res.json();
  },

  /**
   * Get all notes from the Obsidian vault
   */
  async getNotes(): Promise<VaultNote[]> {
    const res = await fetch('/api/notes');
    if (!res.ok) throw new Error(`Failed to load vault notes: ${res.statusText}`);
    return res.json();
  },

  /**
   * Get a single note by video ID or filename
   */
  async getNoteById(id: string): Promise<VaultNote> {
    const res = await fetch(`/api/notes/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Note not found: ${id}`);
    return res.json();
  },

  /**
   * Save or update an Obsidian Markdown note in the vault
   */
  async saveNote(fileName: string, content: string): Promise<VaultNote> {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to save note`);
    }
    return res.json();
  },

  /**
   * Delete an Obsidian note from the vault
   */
  async deleteNote(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete note`);
    }
    return res.json();
  },

  /**
   * Execute zero-LLM hybrid search (Dense Qdrant + Sparse SQLite FTS5)
   */
  async search(query: string, category?: string, limit = 8): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(limit),
    });
    if (category && category !== 'All') {
      params.append('category', category);
    }

    const res = await fetch(`/api/search?${params.toString()}`);
    if (!res.ok) throw new Error(`Search request failed`);
    return res.json();
  },

  /**
   * Grounded Vault Q&A (RAG)
   */
  async chat(
    query: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<ChatResponse> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to generate answer`);
    }
    return res.json();
  },

  /**
   * Ingest a new reel / video through the 6-stage multimodal pipeline
   */
  async ingestVideo(
    url: string,
    title?: string,
    category?: string
  ): Promise<IngestResponse> {
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, category }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Video ingestion failed`);
    }
    return res.json();
  },
};
