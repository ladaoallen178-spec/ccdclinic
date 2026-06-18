import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ccdclinic/',
  server: {
    host: 'localhost',
    port: 5174,
    strictPort: false,
    proxy: {
      '/login': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/register': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/health': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/students': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/staff': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/visits': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/inventory': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/inventory-logs': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/bmi-records': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/medical-documents': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
      '/nurses': { target: 'http://localhost:8001', changeOrigin: true, secure: false },
    }
  }
})
