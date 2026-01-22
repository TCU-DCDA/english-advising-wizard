import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Change 'tcu-english-advising' to your actual repository name
  base: '/tcu-english-advising/',
})
