import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BASE lets the same source tree build for:
//   - local dev / docker preview  -> "/"          (default)
//   - GitHub Pages                -> "/web_app_testing/apps/<app-id>/"
// The deploy workflow sets VITE_BASE per app; nothing in the app source
// should hardcode a path prefix.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
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
