import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { createApp } from 'vue';

import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';

import App from './App.vue';

createApp(App).use(Antd).mount('#app');
