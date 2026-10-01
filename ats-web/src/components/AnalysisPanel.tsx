import React from 'react';
import { ScoreRing } from './ScoreRing';
import { GapCard, type GapItem } from './GapCard';
import { useTranslation } from '../i18n/store';

export interface AnalysisPanelProps {
  overallScore: number;
  subScores: {
    keywordMatch:       { score: number; techMatchRate: number; hardSkillMatchRate: number; softSkillMatchRate: number; matchedTech: string[]; missingTech: string[]; matchedHard: string[]; missingHard: string[]; matchedSoft: string[]; missingSoft: string[] };
    formatParseability: { score: number; issues: string[]; passedChecks: string[] };
    experienceFit:      { score: number; yearsRequired: number | null; yearsEstimated: number; feedback: string };
    sectionCompleteness:{ score: number; missingSections: string[]; presentSections: string[] };
  };
  gaps: GapItem[];
  onGapApprove: (skill: string) => void;
  onGapReject:  (skill: string) => void;
  onGapEdit:    (skill: string) => void;
}

/** Main ATS analysis results panel — dashboard-design style, WCAG 2.2 AA compliant. */
export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  overallScore,
  subScores,
  gaps,
  onGapApprove,
  onGapReject,
  onGapEdit,
}) => {
  const { t } = useTranslation();
  const trans = t as any;

  const overallColor =
    overallScore >= 80 ? 'text-emerald-700' :
    overallScore >= 60 ? 'text-sky-700' :
    overallScore >= 40 ? 'text-amber-700' : 'text-red-700';

  const overallBg =
    overallScore >= 80 ? 'bg-emerald-50 border-emerald-200' :
    overallScore >= 60 ? 'bg-sky-50 border-sky-200' :
    overallScore >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  const subScoreItems = [
    {
      score: subScores.keywordMatch.score,
      label: t.analysis?.subScores?.keywords?.title ?? 'Keywords',
    },
    {
      score: subScores.formatParseability.score,
      label: t.analysis?.subScores?.parseability?.title ?? 'Parseability',
    },
    {
      score: subScores.experienceFit.score,
      label: t.analysis?.subScores?.experience?.title ?? 'Experience',
    },
    {
      score: subScores.sectionCompleteness.score,
      label: t.analysis?.subScores?.completeness?.title ?? 'Completeness',
    },
  ];

  return (
    <section
      aria-labelledby="analysis-heading"
      className="flex flex-col gap-8"
    >
      {/* Overall score banner */}
      <div
        className={`rounded-2xl border p-6 flex flex-col sm:flex-row items-center gap-6 ${overallBg}`}
      >
        <div
          role="meter"
          aria-label={`Overall ATS score: ${overallScore} out of 100`}
          aria-valuenow={overallScore}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`text-7xl font-black tabular-nums leading-none ${overallColor}`}
        >
          {overallScore}
          <span className="text-3xl font-bold">%</span>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2
            id="analysis-heading"
            className="text-xl font-bold text-slate-800 mb-1"
          >
            {trans.analysis?.overallTitle ?? 'ATS Match Score'}
          </h2>
          <p className="text-sm text-slate-600">
            {subScores.experienceFit.feedback}
          </p>
        </div>
      </div>

      {/* Sub-score rings */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-white rounded-2xl border border-slate-200 p-6"
        aria-label="Score breakdown"
      >
        {subScoreItems.map((item) => (
          <div key={item.label} className="flex justify-center">
            <ScoreRing score={item.score} label={item.label} size={90} stroke={7} />
          </div>
        ))}
      </div>

      {/* Matched & Missing skill chips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Matched */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
            {trans.analysis?.matched ?? 'Matched Skills'}
            <span className="ml-auto text-xs font-normal text-slate-400">
              {[...subScores.keywordMatch.matchedTech, ...subScores.keywordMatch.matchedHard, ...subScores.keywordMatch.matchedSoft].length}
            </span>
          </h3>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Matched skills">
            {[...subScores.keywordMatch.matchedTech, ...subScores.keywordMatch.matchedHard].map((skill) => (
              <span
                key={skill}
                role="listitem"
                className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Missing */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" aria-hidden="true" />
            {trans.analysis?.missing ?? 'Missing Skills'}
            <span className="ml-auto text-xs font-normal text-slate-400">
              {[...subScores.keywordMatch.missingTech, ...subScores.keywordMatch.missingHard].length}
            </span>
          </h3>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Missing skills">
            {[...subScores.keywordMatch.missingTech, ...subScores.keywordMatch.missingHard].map((skill) => (
              <span
                key={skill}
                role="listitem"
                className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Format issues */}
      {subScores.formatParseability.issues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">
            {trans.analysis?.formatIssues ?? 'Format Issues'}
          </h3>
          <ul className="space-y-1" aria-label="Format issues list">
            {subScores.formatParseability.issues.map((issue) => (
              <li key={issue} className="text-xs text-amber-700 flex items-start gap-2">
                <span className="mt-0.5 shrink-0" aria-hidden="true">⚠</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gap-closing panel */}
      {gaps.length > 0 && (
        <section aria-labelledby="gaps-heading">
          <h3
            id="gaps-heading"
            className="text-base font-bold text-slate-800 mb-4"
          >
            {trans.analysis?.gapClose ?? 'Gap-Closing Suggestions'}
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({gaps.filter((g) => g.status === 'missing').length} {trans.analysis?.remaining ?? 'remaining'})
            </span>
          </h3>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            role="list"
            aria-label="Gap-closing suggestions"
          >
            {gaps.map((gap) => (
              <div key={gap.skill} role="listitem">
                <GapCard
                  item={gap}
                  onApprove={onGapApprove}
                  onReject={onGapReject}
                  onEdit={onGapEdit}
                  labels={{
                    approve:    trans.gaps?.approve    ?? 'Approve',
                    reject:     trans.gaps?.reject     ?? 'Reject',
                    edit:       trans.gaps?.edit       ?? 'Edit',
                    suggestion: trans.gaps?.suggestion ?? 'Suggested rewrite',
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
};
