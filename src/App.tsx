import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/views/LandingPage';
import { SearchPage } from './components/views/SearchPage';
import { ChatPage } from './components/views/ChatPage';
import { IngestPage } from './components/views/IngestPage';
import { VaultPage } from './components/views/VaultPage';
import { DiagnosticsPage } from './components/views/DiagnosticsPage';
import { CommandPalette } from './components/ui/CommandPalette';
import { ToastProvider, useToast } from './components/ui/Toast';
import { VaultNote, HealthStats } from './types';
import { api } from './services/api';

type TabId = 'landing' | 'search' | 'chat' | 'ingest' | 'vault' | 'health';

function ReelToRealApp() {
  const [activeTab, setActiveTab] = useState<TabId>('landing');
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuerySeed, setSearchQuerySeed] = useState<string>('');

  const toast = useToast();

  const fetchNotes = useCallback(async () => {
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setStats(data);
    } catch (err) {
      console.error('Failed to load health stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    fetchStats();
  }, [fetchNotes, fetchStats]);

  const handleReindex = async () => {
    try {
      const res = await api.reindexVault();
      await fetchNotes();
      await fetchStats();
      toast.success(
        'Indexes Synchronized',
        `Indexed ${res.notesCount} notes into ${res.chunksCount} Qdrant & FTS5 chunks`
      );
    } catch (err: any) {
      toast.error('Reindex Error', err.message);
    }
  };

  const handleDeleteNote = async (id: string) => {
    await api.deleteNote(id);
    await fetchNotes();
    await fetchStats();
  };

  const handleSaveNote = async (fileName: string, content: string) => {
    await api.saveNote(fileName, content);
    await fetchNotes();
    await fetchStats();
  };

  const handleOpenNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setActiveTab('vault');
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuerySeed(query);
    setActiveTab('search');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500/30 selection:text-purple-200">
      {/* Cinematic Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        stats={stats}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onQuickIngest={() => setActiveTab('ingest')}
        onReindex={handleReindex}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="flex-1"
          >
            {activeTab === 'landing' && (
              <LandingPage
                onNavigateTab={setActiveTab}
                onQuickSearch={handleQuickSearch}
                totalNotes={notes.length}
                totalChunks={stats?.vector_db.chunks ?? 0}
              />
            )}

            {activeTab === 'search' && (
              <SearchPage
                initialQuery={searchQuerySeed}
                onOpenNote={handleOpenNote}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'chat' && <ChatPage />}

            {activeTab === 'ingest' && (
              <IngestPage
                onIngestComplete={async () => {
                  await fetchNotes();
                  await fetchStats();
                }}
                onOpenNote={handleOpenNote}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'vault' && (
              <VaultPage
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelectNote={(id) => setSelectedNoteId(id)}
                onDeleteNote={handleDeleteNote}
                onSaveNote={handleSaveNote}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'health' && (
              <DiagnosticsPage
                stats={stats}
                onRefresh={fetchStats}
                onReindex={handleReindex}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Command Palette (⌘K / Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        notes={notes}
        onNavigateTab={setActiveTab}
        onSelectNote={(id) => {
          setSelectedNoteId(id);
          setActiveTab('vault');
        }}
        onQuickSearch={handleQuickSearch}
        onReindex={handleReindex}
      />

      {/* Product Footer */}
      <Footer onSelectTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ReelToRealApp />
    </ToastProvider>
  );
}
