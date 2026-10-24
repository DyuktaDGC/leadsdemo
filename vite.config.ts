import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['@tanstack/react-query', 'lucide-react', 'react', 'react-dom/client', 'react-router-dom']
  },
  resolve: {
    alias: {
      '@app': src('app'),
      '@hooks': src('hooks'),
      '@logic': src('logic'),
      '@pages': src('pages'),
      '@shared': src('shared')
    }
  }
})
