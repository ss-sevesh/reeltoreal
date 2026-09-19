export interface VaultNoteMeta {
  title: string;
  category: string;
  video_id: string;
  source_url: string;
  date: string;
  language?: string;
  duration_seconds?: number;
  tags: string[];
  entities?: {
    places?: string[];
    objects?: string[];
    actions?: string[];
  };
}

export interface VaultNote extends VaultNoteMeta {
  id: string;
  fileName: string;
  summary: string;
  transcript: string;
  captions: string;
  rawContent: string;
  note_path: string;
}

export interface SearchResult {
  video_id: string;
  title: string;
  category: string;
  source_url: string;
  note_path: string;
  rrf_score: number;
  similarity_score: number;
  top_chunk_type: 'caption' | 'transcript' | 'summary' | 'keyword';
  timestamp: string | null;
  highlight_text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title: string;
    source_url: string;
    category: string;
    video_id: string;
    timestamp?: string;
    excerpt?: string;
  }>;
  elapsedMs?: number;
}

export interface HealthStats {
  ollama: {
    online: boolean;
    model: string;
    latencyMs: number;
  };
  vector_db: {
    active: boolean;
    chunks: number;
    storagePath: string;
    latencyMs: number;
  };
  fts_db: {
    active: boolean;
    records: number;
    storagePath: string;
    latencyMs: number;
  };
  vault: {
    notesCount: number;
    notesDir: string;
  };
}
