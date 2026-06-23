import { defineConfig, loadEnv } from 'vite'

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const apiTarget = process.env.VITE_API_URL || 'http://localhost:8001';

  return defineConfig({
    base: '/',
    server: {
      host: 'localhost',
      port: 5174,
      strictPort: false,
      proxy: {
        '/login': { target: apiTarget, changeOrigin: true, secure: false },
        '/register': { target: apiTarget, changeOrigin: true, secure: false },
        '/health': { target: apiTarget, changeOrigin: true, secure: false },
        '/students': { target: apiTarget, changeOrigin: true, secure: false },
        '/staff': { target: apiTarget, changeOrigin: true, secure: false },
        '/visits': { target: apiTarget, changeOrigin: true, secure: false },
        '/inventory': { target: apiTarget, changeOrigin: true, secure: false },
        '/inventory-logs': { target: apiTarget, changeOrigin: true, secure: false },
        '/bmi-records': { target: apiTarget, changeOrigin: true, secure: false },
        '/medical-documents': { target: apiTarget, changeOrigin: true, secure: false },
        '/nurses': { target: apiTarget, changeOrigin: true, secure: false },
      }
    }
  })
}
