import React from 'react';
import type { BatchAnalysisResponse, BatchAnalysisResultItem } from '@ats-analyzer/contracts';
import { useTranslation } from '../i18n/store';
import { ScoreRing } from './ScoreRing';
import { Trophy, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface BatchComparisonMatrixProps {
  results: BatchAnalysisResponse;
}

export const BatchComparisonMatrix: React.FC<BatchComparisonMatrixProps> = ({ results }) => {
  const { t } = useTranslation();

  if (!results || !results.results || results.results.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <p className="text-sm">{t.batch.noResultsYet}</p>
      </div>
    );
  }

  // Find best match overall score among results that don't have fatal errors
  const validResults = results.results.filter((r) => !r.error);
  const maxScore = validResults.length > 0
    ? Math.max(...validResults.map((r) => r.overallScore))
    : -1;

  // Responsive column layout based on number of items
  const colCount = results.results.length;
  const gridClasses =
    colCount === 1
      ? 'grid-cols-1 max-w-md mx-auto'
      : colCount === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : colCount === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : colCount === 4
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{t.batch.comparisonMatrixTitle}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-normal">
              {results.results.length} {results.results.length === 1 ? 'Job' : 'Jobs'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.batch.subtitle}
          </p>
        </div>
      </div>

      {/* Side-by-side columns */}
      <div
        data-testid="batch-comparison-matrix"
        className={`grid ${gridClasses} gap-5 items-stretch`}
      >
        {results.results.map((item: BatchAnalysisResultItem, idx: number) => {
          const isBestMatch = !item.error && item.overallScore === maxScore && validResults.length > 1;

          return (
            <div
              key={item.jobId || idx}
              data-testid={`batch-result-col-${idx}`}
              className={`rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                isBestMatch
                  ? 'bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                  : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Best Match Badge */}
              {isBestMatch && (
                <div
                  data-testid="best-match-badge"
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider shrink-0 z-10"
                >
                  <Trophy className="w-3 h-3 text-amber-300" />
                  <span>{t.batch.bestMatch}</span>
                </div>
              )}

              <div className="space-y-5">
                {/* Column Header: Job Title & Company */}
                <div className="text-center pt-1 border-b border-slate-800 pb-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t.batch.jobCardTitle(item.jobIndex !== undefined ? item.jobIndex + 1 : idx + 1)}
                  </div>
                  <h3 className="text-base font-bold text-white truncate mt-0.5" title={item.jobTitle}>
                    {item.jobTitle || `Job #${idx + 1}`}
                  </h3>
                  {item.company && (
                    <p className="text-xs text-indigo-400 font-medium truncate mt-0.5" title={item.company}>
                      {item.company}
                    </p>
                  )}
                </div>

                {/* Fatal Error State (if any) */}
                {item.error ? (
                  <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">{t.batch.jobError}</strong>
                      <span className="text-[11px] text-red-300/80 mt-1 block">{item.error}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Overall Score with ScoreRing */}
                    <div className="flex flex-col items-center justify-center py-2 bg-slate-950/50 rounded-xl border border-slate-800/60">
                      <ScoreRing
                        score={item.overallScore}
                        label={t.batch.overallScore}
                        size={88}
                        stroke={7}
                      />
                    </div>

                    {/* All 4 Sub-Scores Side-by-Side */}
                    <div className="space-y-3 bg-slate-950/30 rounded-xl p-3 border border-slate-800/60">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                        Sub-Score Breakdown
                      </div>

                      {/* 1. Keyword Match */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">{t.batch.keywordMatch}</span>
                          <span className="font-bold text-indigo-400">{item.subScores?.keywordMatch?.score ?? 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, item.subScores?.keywordMatch?.score ?? 0))}%` }}
                          />
                        </div>
                        {item.subScores?.keywordMatch && (
                          <div className="text-[10px] text-slate-400 flex justify-between">
                            <span>Tech: {item.subScores.keywordMatch.techMatchRate}%</span>
                            <span>Hard: {item.subScores.keywordMatch.hardSkillMatchRate}%</span>
                          </div>
                        )}
                      </div>

                      {/* 2. Format & Parseability */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">{t.batch.formatParseability}</span>
                          <span className="font-bold text-emerald-400">{item.subScores?.formatParseability?.score ?? 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, item.subScores?.formatParseability?.score ?? 0))}%` }}
                          />
                        </div>
                        {item.subScores?.formatParseability && (
                          <div className="text-[10px] text-slate-400">
                            {t.batch.checksPassed(item.subScores.formatParseability.passedChecks?.length ?? 0)}
                          </div>
                        )}
                      </div>

                      {/* 3. Experience Fit */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">{t.batch.experienceFit}</span>
                          <span className="font-bold text-sky-400">{item.subScores?.experienceFit?.score ?? 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, item.subScores?.experienceFit?.score ?? 0))}%` }}
                          />
                        </div>
                        {item.subScores?.experienceFit && (
                          <div className="text-[10px] text-slate-400">
                            {t.batch.yearsComparison(
                              item.subScores.experienceFit.yearsEstimated ?? 0,
                              item.subScores.experienceFit.yearsRequired ?? 0
                            )}
                          </div>
                        )}
                      </div>

                      {/* 4. Section Completeness */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">{t.batch.sectionCompleteness}</span>
                          <span className="font-bold text-purple-400">{item.subScores?.sectionCompleteness?.score ?? 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, item.subScores?.sectionCompleteness?.score ?? 0))}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t.batch.completenessDetail}
                        </div>
                      </div>
                    </div>

                    {/* Matched Skills Badges */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.batch.matchedSkills} ({item.matchedSkills?.length ?? 0})</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {(item.matchedSkills || []).length > 0 ? (
                          item.matchedSkills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-md font-medium"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">None detected</span>
                        )}
                      </div>
                    </div>

                    {/* Missing Skills Badges */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.batch.missingSkills} ({item.missingSkills?.length ?? 0})</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {(item.missingSkills || []).length > 0 ? (
                          item.missingSkills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] bg-amber-950/50 border border-amber-800/80 text-amber-300 px-2 py-0.5 rounded-md font-medium"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">None missing</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
