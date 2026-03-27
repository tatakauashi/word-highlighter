import { resolve } from 'path'
import { defineConfig } from 'vite'

// Vite をプラグインなしで Chrome Extension (MV3) 向けにビルドする設定。
// root を src/ に設定することで options.html の出力パスが dist/options/options.html になる。
// manifest.json はビルド後スクリプトでコピーする。

export default defineConfig({
  root: resolve(__dirname, 'src'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // ソースマップは拡張機能レビューポリシーに影響するため無効
    sourcemap: false,
    rollupOptions: {
      input: {
        options: resolve(__dirname, 'src/options/options.html'),
        content: resolve(__dirname, 'src/content/highlighter.ts'),
        background: resolve(__dirname, 'src/background/service_worker.ts'),
      },
      output: {
        // content script と service worker はチャンク分割しない（単一ファイル必須）
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') return 'content/highlighter.js'
          if (chunk.name === 'background') return 'background/service_worker.js'
          return 'options/[name].js'
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'options/[name][extname]'
          return '[name][extname]'
        },
      },
    },
  },
})
