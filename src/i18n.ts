import { nextTick } from 'vue';
import { createI18n, I18n, I18nOptions } from 'vue-i18n';

export const SUPPORTED_LOCALES = [
  'en',
  'zh',
];

export function setupI18n(options = <I18nOptions>{ locale: 'en' }) {
  const i18n = createI18n({
    ...options,
    legacy: false,
  });
  if (options.locale) setI18nLanguage(i18n, options.locale || 'en');
  return i18n;
}

export function setI18nLanguage(i18n: I18n<unknown, unknown, unknown, false>, locale: string) {
  i18n.global.locale.value = locale;
  document.querySelector('html')?.setAttribute('lang', locale);
}

export async function loadLocaleMessages(i18n: I18n<unknown, unknown, unknown, false>, locale: string) {
  const messages = await import(`./locales/${locale}.json`);
  i18n.global.setLocaleMessage(locale, messages);
  console.log('loaded', messages);
  return nextTick();
}
