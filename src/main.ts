import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';

import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';

import App from './App.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: await import('./locales/en.json'),
  },
});

const app = createApp(App);
app.use(i18n);
app.use(Antd);
app.mount('#app');
