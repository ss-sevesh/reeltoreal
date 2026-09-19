import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    watch: {
      // Prevent Vite HMR from reloading the page when the pipeline writes
      // new Obsidian notes (.md), databases (.db, .sqlite), or raw data to disk.
      ignored: [
        '**/vault/**',
        '**/data/**',
        '**/*.db',
        '**/*.sqlite',
        '**/*.sqlite3',
        '**/qdrant_storage/**',
        '**/__pycache__/**',
        '**/*.pyc',
        '**/venv/**',
        '**/*.log',
        '**/scratch/**',
        '**/.system_generated/**',
        '**/*.tmp',
      ],
    },
  },
});

