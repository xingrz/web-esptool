import { defineConfig, splitVendorChunkPlugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueI18n from '@intlify/vite-plugin-vue-i18n';
import { resolve } from 'path';
import elf from './rollup-plugin-elf.mjs';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-bundler.js',
    },
  },
  plugins: [
    elf(),
    vue(),
    vueI18n({
      include: resolve(__dirname, './src/locales/**'),
    }),
    splitVendorChunkPlugin(),
  ],
});
