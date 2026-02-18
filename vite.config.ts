import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(() => {
  const disablePwa = process.env.VITE_PWA_DISABLE === 'true'

  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        disable: disablePwa,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': [
              '@radix-ui/react-checkbox',
              '@radix-ui/react-dialog',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-select',
              '@radix-ui/react-slot',
              'lucide-react',
              'class-variance-authority',
              'clsx',
              'tailwind-merge',
            ],
            'vendor-pdf': ['jspdf'],
          },
        },
      },
    },
  }
})
