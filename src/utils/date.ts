import { Task, TaskStatus } from '../types';

/**
 * Get user's local date in 'YYYY-MM-DD' format
 */
export function getLocalTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format today's date in Korean friendly string
 * e.g., '2026년 11월 3일 (화)'
 */
export function formatKoreanToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = days[now.getDay()];
  return `${year}년 ${month}월 ${date}일 (${dayName})`;
}

/**
 * Format 'YYYY-MM-DD' to Korean display
 * e.g., '11월 4일 (수)' or '2027년 1월 1일 (금)'
 */
export function formatDueDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '마감일 없음';
  
  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

  const dateObj = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = days[dateObj.getDay()];

  const currentYear = new Date().getFullYear();
  if (y === currentYear) {
    return `${m}월 ${d}일 (${dayName})`;
  }
  return `${y}년 ${m}월 ${d}일 (${dayName})`;
}

/**
 * Calculate difference in calendar days between today and target date
 * targetDate - today (positive = future, 0 = today, negative = past)
 */
export function getDiffDaysFromToday(dateStr: string): number {
  const todayStr = getLocalTodayString();
  if (dateStr === todayStr) return 0;

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [dy, dm, dd] = dateStr.split('-').map(Number);

  const tUtc = Date.UTC(ty, tm - 1, td);
  const dUtc = Date.UTC(dy, dm - 1, dd);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((dUtc - tUtc) / msPerDay);
}

/**
 * Determine task status strictly based on rules:
 * 1. Completed tasks are NEVER 'overdue'
 * 2. If no due date: 'no_due_date'
 * 3. Today's date is strictly 'due_today' (never overdue)
 * 4. Earlier than today and uncompleted: 'overdue'
 * 5. Later than today: 'upcoming'
 */
export function getTaskStatus(task: Pick<Task, 'dueDate' | 'completed'>): TaskStatus {
  if (task.completed) {
    return 'completed';
  }
  if (!task.dueDate) {
    return 'no_due_date';
  }

  const todayStr = getLocalTodayString();
  if (task.dueDate < todayStr) {
    return 'overdue';
  }
  if (task.dueDate === todayStr) {
    return 'due_today';
  }
  return 'upcoming';
}

/**
 * Returns D-Day badge label and styling info
 */
export function getDueDateBadgeInfo(task: Pick<Task, 'dueDate' | 'completed'>): {
  label: string;
  subLabel?: string;
  badgeClass: string;
  status: TaskStatus;
} {
  const status = getTaskStatus(task);

  if (status === 'completed') {
    return {
      label: '완료됨',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      status,
    };
  }

  if (status === 'no_due_date') {
    return {
      label: '마감일 없음',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      status,
    };
  }

  if (status === 'overdue') {
    const diff = getDiffDaysFromToday(task.dueDate!);
    return {
      label: '기한 지남',
      subLabel: `${Math.abs(diff)}일 지남`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
      status,
    };
  }

  if (status === 'due_today') {
    return {
      label: '오늘 마감',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      status,
    };
  }

  // Upcoming
  const diff = getDiffDaysFromToday(task.dueDate!);
  const dDayLabel = diff === 1 ? '내일 마감' : `D-${diff}`;
  return {
    label: dDayLabel,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    status,
  };
}
