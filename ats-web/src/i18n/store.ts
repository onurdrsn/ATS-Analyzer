import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Language } from '@ats-analyzer/contracts';
import { en, tr, type TranslationDict } from './translations';

export type { TranslationDict };

interface I18nState {
  language: Language;
  t: TranslationDict;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const syncDocumentLang = (lang: Language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
};

const memoryStorage = new Map<string, string>();
const safeStorage = {
  getItem: (key: string) =>
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(key)
      : memoryStorage.get(key) || null,
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    } else {
      memoryStorage.set(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    } else {
      memoryStorage.delete(key);
    }
  },
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'en',
      t: en,
      setLanguage: (language: Language) => {
        syncDocumentLang(language);
        set({
          language,
          t: language === 'tr' ? tr : en,
        });
      },
      toggleLanguage: () => {
        const nextLang: Language = get().language === 'en' ? 'tr' : 'en';
        get().setLanguage(nextLang);
      },
    }),
    {
      name: 'ats_analyzer_language',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = state.language === 'tr' ? tr : en;
          syncDocumentLang(state.language);
        }
      },
    }
  )
);

export function useTranslation() {
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);
  const toggleLanguage = useI18nStore((s) => s.toggleLanguage);
  const t = useI18nStore((s) => s.t);
  return { language, setLanguage, toggleLanguage, t };
}
