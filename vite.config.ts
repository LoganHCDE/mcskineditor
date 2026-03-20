import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/mcskineditor/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'favicon-no-store-dev',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const path = req.url?.split('?')[0] ?? ''
          if (path === '/favicon.svg' || path.endsWith('/favicon.svg')) {
            res.setHeader('Cache-Control', 'no-store')
          }
          next()
        })
      },
    },
  ],
})
