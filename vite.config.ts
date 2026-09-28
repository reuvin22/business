import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      // Remove every console.log / console.error / ... (ours and the libraries') from the production build
      output: { minify: { compress: { dropConsole: true } } },
    },
  },
  server: {
    // Keep the Firebase service account key from being served by the dev server.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', 'my-business.json'] },
  },
})
