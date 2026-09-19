import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Send,
  Sparkles,
  ExternalLink,
  Clock,
  Tag,
  Trash2,
  Download,
  Copy,
  Check,
  Film,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content:
        'Hello! I am your ReelToReal Grounded Knowledge Assistant. I formulate answers strictly from your saved reels, transcripts, and visual scene captions without hallucinating.\n\nAsk me about recipes, outdoor adventures, visual actions, or things spoken in your vault!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const sampleQuestions = [
    'What was the young man wearing in front of the elephants?',
    'What traditional South Indian dishes were featured in Chennai?',
    'What did the speaker say about elephants in the video?',
    'What outdoor activities are shown in The Great Outdoors?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend.trim(),
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Chat request failed');
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        elapsedMs: data.elapsedMs,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error('Synthesis Error', err.message || 'Failed to synthesize answer');
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content:
            'I encountered an error synthesizing the grounded answer. Please ensure the local backend or Gemini engine is reachable, or try reindexing your vault.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'init-reset',
        role: 'assistant',
        content:
          'Chat history reset. How can I assist you with your ReelToReal vault?',
      },
    ]);
    toast.info('Chat Cleared', 'Conversation history was reset');
  };

  const handleExportChat = () => {
    const markdown = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? '👤 User' : '🤖 ReelToReal Assistant'}\n\n${
            m.content
          }\n\n${
            m.sources && m.sources.length > 0
              ? `**Sources Cited:**\n${m.sources
                  .map(
                    (s) =>
                      `- [${s.title}](${s.source_url}) [${s.category}]${
                        s.timestamp ? ` @ ${s.timestamp}` : ''
                      }`
                  )
                  .join('\n')}\n\n`
              : ''
          }`
      )
      .join('---\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reeltoreal-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Chat Exported', 'Saved as Markdown file');
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-pink-400 font-semibold text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded Retrieval-Augmented Generation</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
              Vault Chat & Knowledge Synthesis
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Ask questions across your entire library of Instagram Reels and YouTube Shorts. Answers are grounded exclusively in verified audio transcripts and visual scene captions with zero hallucination.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportChat}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export .md
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              icon={<Trash2 className="w-3.5 h-3.5 text-slate-400" />}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Prompt Suggestions */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Try asking:</span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-pink-500/40 text-slate-300 hover:text-pink-200 text-xs transition cursor-pointer disabled:opacity-50 text-left"
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 sm:p-6 min-h-[460px] flex flex-col justify-between shadow-xl">
        <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2">
          {messages.map((m) => {
            const isUser = m.role === 'user';

            return (
              <div
                key={m.id}
                className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUser
                      ? 'bg-purple-600 text-white'
                      : 'bg-pink-500/10 border border-pink-500/20 text-pink-400'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`space-y-2 max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed shadow-sm relative group ${
                      isUser
                        ? 'bg-purple-600 text-white rounded-tr-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Copy message button */}
                    <button
                      onClick={() => handleCopyMessage(m.id, m.content)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-white bg-slate-800/80 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Grounded Source Citations */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-pink-300 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
                          Grounded Source Citations ({m.sources.length}):
                        </span>
                        {m.elapsedMs && <span>Synthesis: {m.elapsedMs}ms</span>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {m.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-pink-500/40 transition flex flex-col justify-between space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-slate-100 truncate text-[11px]">
                                {src.title}
                              </span>
                              <Badge variant="purple" size="sm">
                                {src.category}
                              </Badge>
                            </div>

                            {src.excerpt && (
                              <p className="text-[11px] text-slate-400 italic line-clamp-2">
                                "{src.excerpt}"
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                              {src.timestamp ? (
                                <span className="font-mono text-purple-300">@{src.timestamp}</span>
                              ) : (
                                <span className="font-mono">Obsidian Note</span>
                              )}
                              <a
                                href={src.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-pink-400 hover:text-pink-300 font-medium"
                              >
                                <span>Watch Reel</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
                <span>Searching knowledge vault & synthesizing grounded answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your saved videos (e.g. 'What ingredients were in the Chennai food reel?')..."
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 disabled:opacity-50 transition"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!input.trim() || loading}
              loading={loading}
              icon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Powered by RAG over verified Obsidian vault notes</span>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
