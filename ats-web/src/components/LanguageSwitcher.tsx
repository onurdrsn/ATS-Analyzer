import React from 'react';
import { useTranslation } from '../i18n/store';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t.header.currentLanguageLabel}
      className="inline-flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 shadow-inner"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        title="English"
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          language === 'en'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('tr')}
        aria-pressed={language === 'tr'}
        title="Türkçe"
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          language === 'tr'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        TR
      </button>
    </div>
  );
};
