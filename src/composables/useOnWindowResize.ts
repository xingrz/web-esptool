import { onMounted, onUnmounted } from 'vue';

export default function useOnWindowResize(handler: () => void): void {
  onMounted(() => window.addEventListener('resize', handler, false));
  onUnmounted(() => window.removeEventListener('resize', handler, false));
}
