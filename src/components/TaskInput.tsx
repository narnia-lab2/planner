import React, { useState, useRef } from 'react';
import { Plus, Calendar, AlertCircle, Check, X } from 'lucide-react';
import { Priority } from '../types';
import { PRIORITY_CONFIG } from './PriorityBadge';
import { getLocalTodayString } from '../utils/date';

interface TaskInputProps {
  onAddTask: (title: string, priority: Priority, dueDate: string | null) => void;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium'); // Default: 보통
  const [dueDate, setDueDate] = useState<string>(''); // empty string means '마감일 없음'
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const todayStr = getLocalTodayString();

  // Quick preset helper
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDueDate(`${y}-${m}-${day}`);
  };

  const setFridayDate = () => {
    const d = new Date();
    const dayOfWeek = d.getDay(); // 0 is Sun, 5 is Fri
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (daysUntilFriday === 0) daysUntilFriday = 7; // next Friday if today is Friday
    d.setDate(d.getDate() + daysUntilFriday);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDueDate(`${y}-${m}-${day}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check empty or whitespace only
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('업무명을 입력해주세요. 공백만으로는 등록할 수 없습니다.');
      inputRef.current?.focus();
      return;
    }

    setErrorMessage(null);
    onAddTask(trimmedTitle, priority, dueDate || null);

    // Reset input fields to defaults
    setTitle('');
    setPriority('medium'); // Reset to default '보통'
    setDueDate('');
    inputRef.current?.focus();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6">
      <form onSubmit={handleSubmit} noValidate>
        {/* Title Input */}
        <div className="mb-4">
          <label htmlFor="task-title" className="block text-sm font-semibold text-slate-800 mb-1.5">
            새 업무 등록 <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMessage && e.target.value.trim().length > 0) {
                  setErrorMessage(null);
                }
              }}
              placeholder="해야 할 업무를 입력하세요 (예: 3분기 실적 보고서 작성)"
              className={`w-full px-4 py-3 text-slate-900 placeholder:text-slate-400 bg-slate-50/50 rounded-xl border text-sm sm:text-base focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                errorMessage
                  ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
              }`}
            />
          </div>

          {/* Validation Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-1.5 mt-2 text-rose-600 text-sm font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Priority & Due Date Settings Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 pt-2 border-t border-slate-100">
          {/* Priority selector */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              우선순위 (기본값: 보통)
            </span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="우선순위 선택">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                const isSelected = priority === p;
                const config = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`h-11 flex items-center justify-center gap-1.5 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? config.activeRing
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.dotClass}`} />
                    <span>{config.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="due-date-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                마감일 (선택사항)
              </label>
              {dueDate ? (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer underline"
                >
                  <X className="w-3 h-3" /> 마감일 없음으로 변경
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">마감일 없음 (선택안함)</span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <input
                id="due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
              />
            </div>

            {/* Quick date chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 font-medium mr-0.5">빠른선택:</span>
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className={`text-xs px-2 py-1 rounded-md border transition cursor-pointer ${
                  dueDate === todayStr
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-medium'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                내일
              </button>
              <button
                type="button"
                onClick={setFridayDate}
                className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                이번 주 금요일
              </button>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="text-xs px-2 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                >
                  지우기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>업무 추가하기</span>
          </button>
        </div>
      </form>
    </div>
  );
};
