import React from 'react';
import { useTranslation } from '../i18n/store';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Layers, FileText } from 'lucide-react';

export type ActiveTab = 'scan' | 'batch' | 'auth';

interface HeaderProps {
  user: { email: string } | null;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, activeTab, onTabChange }) => {
  const { t } = useTranslation();

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30 shrink-0">
          A
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-white m-0">
            {t.header.title}
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {t.header.subtitle}
          </p>
        </div>
      </div>

      {/* Mode Navigation: Single Analysis vs Batch Compare (1-5) */}
      <nav
        aria-label="Analysis mode"
        className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800"
      >
        <button
          type="button"
          data-testid="nav-single-btn"
          onClick={() => onTabChange('scan')}
          aria-current={activeTab === 'scan' ? 'page' : undefined}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'scan'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.header.navSingle}</span>
        </button>

        <button
          type="button"
          data-testid="nav-batch-btn"
          onClick={() => onTabChange('batch')}
          aria-current={activeTab === 'batch' ? 'page' : undefined}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'batch'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t.header.navBatch}</span>
        </button>
      </nav>

      {/* Right side: Language Switcher and User Account */}
      <div className="flex items-center space-x-3">
        <LanguageSwitcher />

        {user ? (
          <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-full text-xs text-indigo-400 border border-slate-700">
            <span>●</span>
            <span className="truncate max-w-[150px]">{user.email}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onTabChange(activeTab === 'auth' ? 'scan' : 'auth')}
            className="text-xs font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
          >
            {activeTab === 'auth' ? t.header.backToScanner : t.header.signIn}
          </button>
        )}
      </div>
    </header>
  );
};
