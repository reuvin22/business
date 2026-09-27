import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Keep the Firebase service account key from being served by the dev server.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', 'my-business.json'] },
  },
})
