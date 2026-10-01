import React from 'react';
import { useBatchStore } from '../store/batchStore';
import { useTranslation } from '../i18n/store';
import { SAMPLE_JOB_EN, SAMPLE_JOB_TR } from '../i18n/samples';
import { validateJobEntry } from '../lib/validation';
import { Plus, Trash2, Link as LinkIcon, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

export const BatchJobInputs: React.FC = () => {
  const { jobs, addJob, removeJob, updateJob, isAnalyzing } = useBatchStore();
  const { t } = useTranslation();

  const isMaxReached = jobs.length >= 5;
  const isMinReached = jobs.length <= 1;

  return (
    <div className="space-y-6">
      {/* Header with counter and Add Job button */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {t.batch.title}
            </h2>
            <span
              data-testid="job-counter"
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
            >
              {t.batch.jobCounter(jobs.length, 5)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t.batch.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="add-job-btn"
            onClick={() => addJob()}
            disabled={isMaxReached || isAnalyzing}
            aria-disabled={isMaxReached || isAnalyzing}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs shadow-md transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4" />
            <span>{t.batch.addJob}</span>
          </button>
          {isMaxReached && (
            <span className="text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-1 rounded-md">
              {t.batch.maxJobsReached}
            </span>
          )}
        </div>
      </div>

      {/* Grid of Job Input Cards (1-5 jobs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {jobs.map((job, idx) => {
          const validation = validateJobEntry(job);
          const hasInput = job.activeInputType === 'url' ? job.jobUrl.trim().length > 0 : job.jobText.trim().length > 0;

          return (
            <div
              key={job.id}
              data-testid={`batch-job-card-${idx}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all hover:border-slate-700"
            >
              <div className="space-y-4">
                {/* Card Top: Number / Title & Remove button */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-indigo-400 text-xs font-bold flex items-center justify-center border border-slate-700">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      {job.jobTitle?.trim() || t.batch.jobCardTitle(idx + 1)}
                    </span>
                  </div>

                  <button
                    type="button"
                    data-testid={`remove-job-btn-${idx}`}
                    onClick={() => removeJob(job.id)}
                    disabled={isMinReached || isAnalyzing}
                    aria-label={`${t.batch.removeJob} ${idx + 1}`}
                    title={isMinReached ? t.batch.minJobsRequired : t.batch.removeJob}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Optional Job Title & Company Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {t.batch.jobTitleLabel}
                    </label>
                    <input
                      type="text"
                      value={job.jobTitle || ''}
                      onChange={(e) => updateJob(job.id, { jobTitle: e.target.value })}
                      placeholder={t.batch.jobTitlePlaceholder}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {t.batch.companyLabel}
                    </label>
                    <input
                      type="text"
                      value={job.company || ''}
                      onChange={(e) => updateJob(job.id, { company: e.target.value })}
                      placeholder={t.batch.companyPlaceholder}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Dual URL / Text Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                      <button
                        type="button"
                        data-testid={`toggle-text-btn-${idx}`}
                        onClick={() => updateJob(job.id, { activeInputType: 'text' })}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                          job.activeInputType === 'text'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{t.batch.textTab}</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`toggle-url-btn-${idx}`}
                        onClick={() => updateJob(job.id, { activeInputType: 'url' })}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                          job.activeInputType === 'url'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>{t.batch.urlTab}</span>
                      </button>
                    </div>

                    {job.activeInputType === 'text' && (
                      <div className="flex items-center space-x-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            updateJob(job.id, {
                              jobText: SAMPLE_JOB_EN,
                              jobTitle: job.jobTitle || 'Senior Fullstack Engineer',
                              company: job.company || 'TechCorp Global',
                            })
                          }
                          className="text-indigo-400 hover:text-indigo-300"
                        >
                          {t.batch.loadSampleJobEn}
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateJob(job.id, {
                              jobText: SAMPLE_JOB_TR,
                              jobTitle: job.jobTitle || 'Kıdemli Yazılım Geliştirici',
                              company: job.company || 'Kariyer Teknoloji A.Ş.',
                            })
                          }
                          className="text-indigo-400 hover:text-indigo-300"
                        >
                          {t.batch.loadSampleJobTr}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Active Input: URL */}
                  {job.activeInputType === 'url' ? (
                    <div>
                      <input
                        type="url"
                        data-testid={`job-url-input-${idx}`}
                        value={job.jobUrl}
                        onChange={(e) => updateJob(job.id, { jobUrl: e.target.value })}
                        placeholder={t.batch.urlPlaceholder}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  ) : (
                    /* Active Input: Raw Text */
                    <div>
                      <textarea
                        rows={5}
                        data-testid={`job-text-input-${idx}`}
                        value={job.jobText}
                        onChange={(e) => updateJob(job.id, { jobText: e.target.value })}
                        placeholder={t.batch.textPlaceholder}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                        <span>{t.batch.textTooShort}</span>
                        <span>{job.jobText.trim().length} chars</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Feedback Footer */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                {hasInput ? (
                  validation.isValid ? (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready for analysis</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>
                        {validation.error === 'invalidUrl'
                          ? t.batch.invalidUrl
                          : validation.error === 'textTooShort'
                          ? t.batch.textTooShort
                          : t.batch.validInputRequired}
                      </span>
                    </span>
                  )
                ) : (
                  <span className="text-slate-500 text-[11px]">
                    {t.batch.validInputRequired}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
