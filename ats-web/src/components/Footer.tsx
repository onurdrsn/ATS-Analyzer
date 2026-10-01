import React from 'react';
import { useTranslation } from '../i18n/store';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
      {t.footer.text}
    </footer>
  );
};
