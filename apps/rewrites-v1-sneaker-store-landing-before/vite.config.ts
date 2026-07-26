import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VITE_BASE lets the same source tree build for:
//   - local dev / docker preview  -> "/"          (default)
//   - the deployed site           -> "/apps/<app-id>/"
// The deploy path is set per app at build time; nothing in the app source
// should hardcode a path prefix.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  // Tailwind is wired but inert unless src/index.css keeps its
  // `@import "tailwindcss"` line — plain CSS apps are unaffected.
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // three.js and drei push past the default warning limit on 3D apps; the
    // warning is noise in the build log the agent has to read.
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      // Needed for file changes to propagate from a bind-mounted host dir.
      usePolling: true,
      interval: 300,
    },
  },
})
