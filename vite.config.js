import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Logo_fisiosalud.png', 'Logo_fisiosalud_simple.png'],
      manifest: {
        name: 'FisioSalud — Turnos Lic. Carrizo',
        short_name: 'FisioSalud',
        description: 'Reserva de turnos online · Lic. Miguel Carrizo · Rehabilitación Traumatológica',
        theme_color: '#1565C0',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        lang: 'es',
        icons: [
          {
            src: '/Logo_fisiosalud_simple.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/Logo_fisiosalud_simple.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'firestore-cache' },
          },
        ],
      },
    }),
  ],
})
