import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 纯前端 React 应用构建到 dist/；由 Cloudflare Worker（wrangler.jsonc 的 assets 绑定）负责托管与 /api 路由。
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});