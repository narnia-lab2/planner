import React from 'react';
import { Task } from '../types';
import { getTaskStatus } from '../utils/date';
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react';

interface StatsBannerProps {
  tasks: Task[];
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ tasks }) => {
  const total = tasks.length;
  if (total === 0) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const inProgressCount = total - completedCount;

  const todayCount = tasks.filter((t) => getTaskStatus(t) === 'due_today').length;
  const overdueCount = tasks.filter((t) => getTaskStatus(t) === 'overdue').length;

  const completionRate = Math.round((completedCount / total) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 shadow-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3.5">
        {/* Total & In Progress */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">진행 중 / 전체</div>
            <div className="text-lg font-bold text-slate-800">
              <span className="text-blue-600">{inProgressCount}</span>
              <span className="text-slate-400 font-normal text-sm"> / {total}</span>
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div className={`rounded-xl p-3 border flex items-center gap-3 transition-colors ${
          todayCount > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'
        }`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            todayCount > 0 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">오늘 마감</div>
            <div className={`text-lg font-bold ${todayCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {todayCount}건
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className={`rounded-xl p-3 border flex items-center gap-3 transition-colors ${
          overdueCount > 0 ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-100 text-slate-700'
        }`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            overdueCount > 0 ? 'bg-rose-200 text-rose-800' : 'bg-slate-200 text-slate-600'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">기한 지남</div>
            <div className={`text-lg font-bold ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {overdueCount}건
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">완료됨</div>
            <div className="text-lg font-bold text-emerald-600">
              {completedCount}건 <span className="text-xs font-normal text-slate-500">({completionRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5 font-medium">
          <span>달성률</span>
          <span className="text-slate-700 font-semibold">{completionRate}% 완료</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
};
