import React, { useState } from 'react';
import { Bot, User, Send, Sparkles, ExternalLink, Clock, Tag } from 'lucide-react';
import { ChatMessage } from '../types';

export const ChatTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hello! I am your ReelToReal Grounded Knowledge Assistant. Ask me anything about your saved reels, recipes, outdoor travels, or visual scenes in your vault.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sampleQuestions = [
    'What was the young man wearing in front of the elephants?',
    'What traditional South Indian dishes were featured in Chennai?',
    'What did the speaker say about elephants in the video?',
    'What outdoor activities are shown in The Great Outdoors?',
  ];

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
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
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: 'Sorry, an error occurred while generating the grounded answer. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-pink-400 font-semibold text-sm mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Grounded Retrieval-Augmented Generation</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
          Vault Chat & Knowledge Synthesis
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Ask questions in natural language over your saved Instagram Reels and YouTube Shorts. Answers are synthesized exclusively from verified video transcripts and visual captions with strict zero-hallucination citations.
        </p>

        {/* Suggested Prompt Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick questions:</span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-pink-900/30 text-slate-200 hover:text-pink-200 border border-slate-700/60 hover:border-pink-500/30 transition cursor-pointer disabled:opacity-50 text-left"
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-pink-500/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm ${
                  isUser
                    ? 'bg-purple-600 text-white rounded-tr-none'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>

                {/* Grounded Sources Citing Specific Reels */}
                {!isUser && m.sources && m.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-400" />
                      <span>Referenced Reels & Pinpointed Moments:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.sources.map((src, i) => (
                        <div
                          key={i}
                          className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs flex flex-col justify-between"
                        >
                          <div className="font-semibold text-slate-200 flex items-center justify-between gap-1 mb-1">
                            <span className="truncate">{src.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                              {src.category}
                            </span>
                          </div>

                          {src.timestamp && (
                            <div className="text-[11px] font-mono text-sky-400 flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" />
                              <span>Moment: {src.timestamp}</span>
                            </div>
                          )}

                          <a
                            href={src.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 mt-1 truncate"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{src.source_url}</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Latency badge */}
                {!isUser && m.elapsedMs && (
                  <div className="mt-2 text-[11px] text-slate-500 font-mono text-right">
                    ⚡ Generated in {(m.elapsedMs / 1000).toFixed(2)}s
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3.5 items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 animate-pulse">
              Synthesizing grounded answer from video transcripts and scene captions...
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="sticky bottom-4 z-20 flex gap-2 bg-slate-900/90 border border-slate-700/80 p-2 rounded-2xl backdrop-blur shadow-xl"
      >
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your saved reels, recipes, places, or scenes..."
          disabled={loading}
          className="flex-1 bg-transparent px-4 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
        />
        <button
          id="btn-chat-send"
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-500/25"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
