import React from 'react';
import { Calendar, CheckCircle2, HardDrive, ShieldCheck } from 'lucide-react';
import { formatKoreanToday } from '../utils/date';

export const Header: React.FC = () => {
  const todayFormatted = formatKoreanToday();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* App Title & Icon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                내 업무 플래너
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>오늘: <strong className="text-slate-700 font-medium">{todayFormatted}</strong></span>
              </p>
            </div>
          </div>

          {/* Storage & Privacy Note Required by Prompt */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 self-start sm:self-auto">
            <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="leading-tight">
              이 브라우저에 저장되며 다른 기기와 자동 동기화되지 않습니다
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
