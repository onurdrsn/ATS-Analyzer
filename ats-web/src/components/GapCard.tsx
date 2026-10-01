import React from 'react';
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

export interface GapItem {
  skill: string;
  category: 'tech' | 'hard' | 'soft';
  originalBullet?: string;
  suggestedRewrite?: string;
  status: 'missing' | 'approved' | 'rejected' | 'editing';
}

interface GapCardProps {
  item: GapItem;
  onApprove: (skill: string) => void;
  onReject: (skill: string) => void;
  onEdit: (skill: string) => void;
  /** i18n labels */
  labels?: {
    approve?: string;
    reject?: string;
    edit?: string;
    missing?: string;
    suggestion?: string;
  };
}

const categoryColors: Record<GapItem['category'], string> = {
  tech:  'bg-indigo-100 text-indigo-700',
  hard:  'bg-amber-100  text-amber-700',
  soft:  'bg-teal-100   text-teal-700',
};

/** Single gap-closing card — fully keyboard accessible (Tab/Enter/Space). */
export const GapCard: React.FC<GapCardProps> = ({
  item,
  onApprove,
  onReject,
  onEdit,
  labels = {},
}) => {
  const l = {
    approve:    labels.approve    ?? 'Approve',
    reject:     labels.reject     ?? 'Reject',
    edit:       labels.edit       ?? 'Edit',
    missing:    labels.missing    ?? 'Missing skill',
    suggestion: labels.suggestion ?? 'Suggested rewrite',
  };

  const isActioned = item.status === 'approved' || item.status === 'rejected';

  /** Handles both click and keyboard (Enter/Space) */
  const handleKey =
    (action: () => void) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    };

  return (
    <article
      className={`
        rounded-xl border p-4 flex flex-col gap-3 transition-colors duration-200
        ${item.status === 'approved' ? 'border-emerald-300 bg-emerald-50' : ''}
        ${item.status === 'rejected' ? 'border-red-300 bg-red-50 opacity-60' : ''}
        ${item.status === 'missing'  ? 'border-slate-200 bg-white' : ''}
        ${item.status === 'editing'  ? 'border-sky-300 bg-sky-50' : ''}
      `}
      aria-label={`Gap: ${item.skill}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[item.category]}`}
          aria-label={`Category: ${item.category}`}
        >
          {item.category.toUpperCase()}
        </span>
        <span className="text-sm font-semibold text-slate-800 flex-1">{item.skill}</span>
        {item.status === 'approved' && (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label="Approved" />
        )}
        {item.status === 'rejected' && (
          <XCircle className="w-4 h-4 text-red-500" aria-label="Rejected" />
        )}
      </div>

      {/* Suggested rewrite */}
      {item.suggestedRewrite && (
        <div className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2 border border-slate-200">
          <span className="font-medium text-slate-500 uppercase tracking-wide text-[10px]">
            {l.suggestion}
          </span>
          <p className="mt-1 leading-relaxed">{item.suggestedRewrite}</p>
        </div>
      )}

      {/* Actions — hidden once actioned */}
      {!isActioned && (
        <div className="flex gap-2 mt-1" role="group" aria-label={`Actions for ${item.skill}`}>
          <button
            type="button"
            onClick={() => onApprove(item.skill)}
            onKeyDown={handleKey(() => onApprove(item.skill))}
            className="
              inline-flex items-center gap-1.5 text-xs font-medium
              px-3 min-h-11 rounded-lg
              bg-emerald-600 text-white
              hover:bg-emerald-700 active:bg-emerald-800
              focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
              transition-colors
            "
            aria-label={`${l.approve} ${item.skill}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            {l.approve}
          </button>

          <button
            type="button"
            onClick={() => onEdit(item.skill)}
            onKeyDown={handleKey(() => onEdit(item.skill))}
            className="
              inline-flex items-center gap-1.5 text-xs font-medium
              px-3 min-h-11 rounded-lg
              bg-sky-600 text-white
              hover:bg-sky-700 active:bg-sky-800
              focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
              transition-colors
            "
            aria-label={`${l.edit} ${item.skill}`}
          >
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            {l.edit}
          </button>

          <button
            type="button"
            onClick={() => onReject(item.skill)}
            onKeyDown={handleKey(() => onReject(item.skill))}
            className="
              inline-flex items-center gap-1.5 text-xs font-medium
              px-3 min-h-11 rounded-lg
              bg-white text-red-600 border border-red-300
              hover:bg-red-50 active:bg-red-100
              focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
              transition-colors
            "
            aria-label={`${l.reject} ${item.skill}`}
          >
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {l.reject}
          </button>
        </div>
      )}
    </article>
  );
};
