import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The game client is a separate Vite app rooted at `client/`. It binds
// only to the pure between-scenario operators in `engine/world-organize.ts`
// (the troop-reference §10 contract) — no engine internals, no Node I/O.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
