import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/store';
import { exportResume } from '../lib/exportClient';
import type { Language, ExportFormat, StructuredResume } from '@ats-analyzer/contracts';
import { FileText, Download, X, AlertCircle } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: StructuredResume;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, resumeData }) => {
  const { language: currentUiLang, t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(currentUiLang);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      await exportResume({
        resumeData,
        format: selectedFormat,
        language: selectedLanguage,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || t.export.errorFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label={t.common.close}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 id="export-modal-title" className="text-xl font-bold text-white mb-1">
          {t.export.modalTitle}
        </h3>
        <p className="text-xs text-slate-400 mb-6">{t.export.modalSubtitle}</p>

        {/* 1. Language Selection */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            {t.export.languageSectionTitle}
          </label>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t.export.languageSectionTitle}>
            <button
              type="button"
              role="radio"
              aria-checked={selectedLanguage === 'en'}
              onClick={() => setSelectedLanguage('en')}
              className={`p-3 rounded-xl border text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                selectedLanguage === 'en'
                  ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-bold text-indigo-400">EN</div>
              <div className="text-xs font-medium text-slate-200">{t.export.languageEn}</div>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={selectedLanguage === 'tr'}
              onClick={() => setSelectedLanguage('tr')}
              className={`p-3 rounded-xl border text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                selectedLanguage === 'tr'
                  ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-bold text-indigo-400">TR</div>
              <div className="text-xs font-medium text-slate-200">{t.export.languageTr}</div>
            </button>
          </div>
        </div>

        {/* 2. Format Selection */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            {t.export.formatSectionTitle}
          </label>
          <div className="space-y-2" role="radiogroup" aria-label={t.export.formatSectionTitle}>
            {[
              { id: 'pdf', title: t.export.pdfTitle, desc: t.export.pdfDescription },
              { id: 'docx', title: t.export.docxTitle, desc: t.export.docxDescription },
              { id: 'tex', title: t.export.texTitle, desc: t.export.texDescription },
            ].map((fmt) => (
              <div
                key={fmt.id}
                role="radio"
                tabIndex={0}
                aria-checked={selectedFormat === fmt.id}
                onClick={() => setSelectedFormat(fmt.id as ExportFormat)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    setSelectedFormat(fmt.id as ExportFormat);
                  }
                }}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  selectedFormat === fmt.id
                    ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileText className={`h-5 w-5 ${selectedFormat === fmt.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-200">{fmt.title}</div>
                    <div className="text-[11px] text-slate-400">{fmt.desc}</div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="exportFormat"
                  checked={selectedFormat === fmt.id}
                  onChange={() => setSelectedFormat(fmt.id as ExportFormat)}
                  tabIndex={-1}
                  className="accent-indigo-500 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition focus:outline-none"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition flex items-center space-x-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Download className="h-4 w-4" />
            <span>
              {loading ? t.export.generatingButton : t.export.downloadButton(selectedFormat, selectedLanguage)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
