import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import featuresPlugin from './tools/featuresPlugin.js'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    featuresPlugin(),
  ],
})
