import { en, type Key } from './en';
import { ru } from './ru';
import { uk } from './uk';

export type Lang = 'en' | 'uk' | 'ru';
export type { Key };
export type Params = Record<string, string | number | undefined>;

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'uk', label: 'Українська' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
];

const DICTS: Record<Lang, Record<Key, string>> = { en, uk, ru };
let current: Lang = 'en';
const listeners: (() => void)[] = [];

export const getLang = (): Lang => current;

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  document.documentElement.lang = lang;
  for (const fn of listeners) fn();
}

export const onLangChange = (fn: () => void): void => {
  listeners.push(fn);
};

/** Browser preference → supported language (uk/ru/en). */
export function detectLang(): Lang {
  const prefs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const p of prefs) {
    const base = p.toLowerCase().slice(0, 2);
    if (base === 'uk' || base === 'ru' || base === 'en') return base;
  }
  return 'en';
}

export const isLang = (v: string): v is Lang => v === 'en' || v === 'uk' || v === 'ru';

/**
 * Translate a key. `{name}` placeholders are filled from params; a param value
 * starting with '@' is itself a key (e.g. '@mod.drill.name'), resolved recursively.
 */
export function t(key: string, params?: Params): string {
  const dict = DICTS[current] as Record<string, string>;
  let s = dict[key] ?? (en as Record<string, string>)[key] ?? key;
  if (params)
    s = s.replace(/\{(\w+)\}/g, (_, name: string) => {
      const v = params[name];
      if (v === undefined) return '';
      return typeof v === 'string' && v.startsWith('@') ? t(v.slice(1)) : String(v);
    });
  return s;
}

/** True if a non-empty translation exists (optional texts like synergies). */
export const has = (key: string): boolean => !!(en as Record<string, string>)[key];
