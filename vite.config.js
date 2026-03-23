import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
