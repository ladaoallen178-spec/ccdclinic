import { defineConfig, loadEnv } from 'vite'

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    base: '/',
    server: {
      host: 'localhost',
      port: 5174,
      strictPort: false,
    }
  })
}
