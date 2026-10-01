import React from 'react';

interface ScoreRingProps {
  score: number;       // 0-100
  label: string;
  size?: number;       // px, default 80
  stroke?: number;     // stroke width, default 6
  color?: string;      // tailwind color token, default 'stroke-indigo-500'
}

/** Accessible circular progress ring for ATS sub-score display. */
export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  label,
  size = 80,
  stroke = 6,
  color,
}) => {
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const scoreColor =
    color ??
    (score >= 80
      ? 'stroke-emerald-500'
      : score >= 60
      ? 'stroke-sky-500'
      : score >= 40
      ? 'stroke-amber-500'
      : 'stroke-red-500');

  const textColor =
    score >= 80
      ? 'text-emerald-600'
      : score >= 60
      ? 'text-sky-600'
      : score >= 40
      ? 'text-amber-600'
      : 'text-red-600';

  return (
    <div
      role="meter"
      aria-label={`${label}: ${score} out of 100`}
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex flex-col items-center gap-2"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="rotate-[-90deg]"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-slate-200"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`${scoreColor} transition-all duration-700 ease-out`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Score text overlay (separate so it doesn't rotate) */}
      <span className={`text-xl font-bold tabular-nums ${textColor}`}>
        {score}
        <span className="text-sm font-normal text-slate-500">%</span>
      </span>
      <span className="text-xs font-medium text-slate-600 text-center leading-tight max-w-[80px]">
        {label}
      </span>
    </div>
  );
};
