import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the build works at philipmathieu.github.io/curtis-redux/,
// in a blog iframe, and under any preview subpath alike.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Two pages: the Fenway spray charts and the fantasy-league standings.
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        league: new URL('./league.html', import.meta.url).pathname,
      },
    },
  },
})
