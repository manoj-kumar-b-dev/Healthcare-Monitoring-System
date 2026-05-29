import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Dev server runs at '/' so react-router-dom BrowserRouter works correctly.
  // Production build keeps '/chat-app/' base for GitHub Pages deployment.
  base: command === 'build' ? '/chat-app/' : '/',
  server: {
    port: 5173,
  },
}))

