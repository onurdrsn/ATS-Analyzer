import React from 'react';
import { useTranslation } from '../i18n/store';

export interface SubScoresProps {
  keywordMatch: {
    score: number;
    techMatchRate: number;
    hardSkillMatchRate: number;
  };
  formatParseability: {
    score: number;
    passedChecks: string[];
  };
  experienceFit: {
    score: number;
    yearsEstimated: number;
    yearsRequired: number | null;
  };
  sectionCompleteness: {
    score: number;
  };
}

export const SubScoreCards: React.FC<{ subScores: SubScoresProps }> = ({ subScores }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Keywords Match */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {t.analysis.subScores.keywords.title}
          </div>
          <div className="text-2xl font-bold text-indigo-400 mb-2">
            {subScores.keywordMatch.score}%
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {t.analysis.subScores.keywords.detail(
            subScores.keywordMatch.techMatchRate,
            subScores.keywordMatch.hardSkillMatchRate
          )}
        </div>
      </div>

      {/* 2. Format & Parseability */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {t.analysis.subScores.parseability.title}
          </div>
          <div className="text-2xl font-bold text-emerald-400 mb-2">
            {subScores.formatParseability.score}%
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {t.analysis.subScores.parseability.detail(
            subScores.formatParseability.passedChecks.length
          )}
        </div>
      </div>

      {/* 3. Experience Fit */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {t.analysis.subScores.experience.title}
          </div>
          <div className="text-2xl font-bold text-sky-400 mb-2">
            {subScores.experienceFit.score}%
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {t.analysis.subScores.experience.detail(
            subScores.experienceFit.yearsEstimated,
            subScores.experienceFit.yearsRequired || 0
          )}
        </div>
      </div>

      {/* 4. Section Completeness */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {t.analysis.subScores.completeness.title}
          </div>
          <div className="text-2xl font-bold text-purple-400 mb-2">
            {subScores.sectionCompleteness.score}%
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {t.analysis.subScores.completeness.detail}
        </div>
      </div>
    </div>
  );
};
