import React from 'react';
import { Priority } from '../types';

export const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string;
    dotClass: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    activeRing: string;
  }
> = {
  high: {
    label: '높음',
    dotClass: 'bg-red-500',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    activeRing: 'ring-2 ring-red-500 ring-offset-1 border-red-500 bg-red-50 text-red-700 font-semibold',
  },
  medium: {
    label: '보통',
    dotClass: 'bg-amber-500',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    activeRing: 'ring-2 ring-amber-500 ring-offset-1 border-amber-500 bg-amber-50 text-amber-700 font-semibold',
  },
  low: {
    label: '낮음',
    dotClass: 'bg-slate-400',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-200',
    activeRing: 'ring-2 ring-slate-400 ring-offset-1 border-slate-400 bg-slate-100 text-slate-700 font-semibold',
  },
};

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const config = PRIORITY_CONFIG[priority];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses}`}
    >
      <span className={`rounded-full shrink-0 ${dotSize} ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  );
};
