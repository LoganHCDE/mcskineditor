import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'favicon-no-store-dev',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split('?')[0] === '/favicon.svg') {
            res.setHeader('Cache-Control', 'no-store')
          }
          next()
        })
      },
    },
  ],
})
