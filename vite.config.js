import { defineConfig, splitVendorChunkPlugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import elf from './rollup-plugin-elf.mjs';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  plugins: [
    elf(),
    vue(),
    splitVendorChunkPlugin(),
  ],
});
