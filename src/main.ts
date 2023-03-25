import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';

import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';

import App from './App.vue';

const app = createApp(App);
app.use(Antd);
app.use(createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'simple',
      component: () => import('@/routes/SimpleView.vue'),
    },
    {
      path: '/studio',
      name: 'studio',
      component: () => import('@/routes/StudioView.vue'),
    },
  ],
}));
app.mount('#app');
