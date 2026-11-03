import './style.css';

/**
 * Storage key constant - MUST remain identical to preserve existing user data
 */
const STORAGE_KEY = 'my_work_planner_tasks_v1';

// Application State
const state = {
  tasks: [],
  filter: 'all', // 'all' | 'active' | 'today' | 'overdue' | 'completed'
  sortBy: 'dueDateAsc', // 'dueDateAsc' | 'dueDateDesc' | 'priorityDesc' | 'createdDesc'
  searchQuery: '',
  storageError: null,
  undoToast: null, // { task, timerId }
  editingTaskId: null,
  editFormState: {
    title: '',
    priority: 'medium',
    dueDate: '',
    error: null,
  },
  // Form input state
  inputPriority: 'medium', // Default: 보통
  inputDueDate: '',
};

/* ============================================================
   Date & Utility Helpers
============================================================ */

/**
 * Get user's local date as 'YYYY-MM-DD'
 */
function getLocalTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format today's date in Korean friendly string
 */
function formatKoreanToday() {
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
 */
function formatDueDateDisplay(dateStr) {
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
 * Calculate difference in calendar days from today
 */
function getDiffDaysFromToday(dateStr) {
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
 * - Completed tasks are excluded from 'overdue'
 * - Today's date is strictly 'due_today' (never overdue)
 * - Before today and uncompleted: 'overdue'
 */
function getTaskStatus(task) {
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
function getDueDateBadgeInfo(task) {
  const status = getTaskStatus(task);

  if (status === 'completed') {
    return {
      label: '완료됨',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconHtml: `<svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`,
    };
  }

  if (status === 'no_due_date') {
    return {
      label: '마감일 없음',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      iconHtml: '',
    };
  }

  if (status === 'overdue') {
    const diff = getDiffDaysFromToday(task.dueDate);
    return {
      label: '기한 지남',
      subLabel: `${Math.abs(diff)}일 지남`,
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
      iconHtml: `<svg class="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
    };
  }

  if (status === 'due_today') {
    return {
      label: '오늘 마감',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      iconHtml: `<svg class="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"></circle><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l3 3"></path></svg>`,
    };
  }

  // Upcoming
  const diff = getDiffDaysFromToday(task.dueDate);
  const dDayLabel = diff === 1 ? '내일 마감' : `D-${diff}`;
  return {
    label: dDayLabel,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-semibold',
    iconHtml: '',
  };
}

/**
 * Generate unique task ID
 */
function generateTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/* ============================================================
   Storage Helpers
============================================================ */

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t) => t && typeof t.id === 'string' && typeof t.title === 'string');
    }
    return [];
  } catch (e) {
    console.error('Storage load failed', e);
    return [];
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    state.storageError = null;
    return true;
  } catch (e) {
    console.error('Storage save failed', e);
    state.storageError = '저장되지 않았습니다. 브라우저 저장 공간이 부족하거나 저장이 차단되어 있을 수 있습니다.';
    return false;
  }
}

function updateTasks(newTasks) {
  state.tasks = newTasks;
  saveTasks(newTasks);
  renderApp();
}

/* ============================================================
   HTML Template Generators
============================================================ */

const PRIORITY_META = {
  high: {
    label: '높음',
    dotClass: 'bg-rose-600',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    ringActive: 'ring-2 ring-rose-500 ring-offset-1 border-rose-500 bg-rose-50 text-rose-800 font-bold',
  },
  medium: {
    label: '보통',
    dotClass: 'bg-amber-600',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    ringActive: 'ring-2 ring-amber-500 ring-offset-1 border-amber-500 bg-amber-50 text-amber-900 font-bold',
  },
  low: {
    label: '낮음',
    dotClass: 'bg-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
    ringActive: 'ring-2 ring-slate-500 ring-offset-1 border-slate-500 bg-slate-100 text-slate-900 font-bold',
  },
};

function renderHeader() {
  const todayStr = formatKoreanToday();
  return `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div class="max-w-4xl mx-auto px-4 py-4 sm:px-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                내 업무 플래너
              </h1>
              <p class="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
                <svg class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"></rect><path stroke-linecap="round" stroke-width="2" d="M16 2v4M8 2v4M3 10h18"></path></svg>
                <span>오늘 날짜: <strong class="text-slate-900 font-bold">${todayStr}</strong></span>
              </p>
            </div>
          </div>

          <div class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 font-medium self-start sm:self-auto max-w-full">
            <svg class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16m-5 5h.01"></path></svg>
            <span class="leading-snug break-keep">
              이 브라우저에 저장되며 다른 기기와 자동 동기화되지 않습니다
            </span>
          </div>
        </div>
      </div>
    </header>
  `;
}

function renderStorageErrorBanner() {
  if (!state.storageError) return '';
  return `
    <div class="mb-6 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
      <div class="flex items-center gap-2.5">
        <svg class="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <div>
          <strong class="font-bold block sm:inline">저장되지 않았습니다.</strong>
          <span class="text-sm text-rose-700 font-medium">${state.storageError}</span>
        </div>
      </div>
      <button id="btn-dismiss-storage-error" class="text-rose-500 hover:text-rose-800 p-1 cursor-pointer">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>
  `;
}

function renderInputSection() {
  const todayStr = getLocalTodayString();
  const isTodaySelected = state.inputDueDate === todayStr;

  return `
    <section aria-label="업무 등록 영역" class="bg-white rounded-2xl border-2 border-blue-500/20 shadow-sm p-4 sm:p-6 mb-8 transition-shadow hover:shadow-md">
      <div class="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              새 업무 등록
            </h2>
            <p class="text-xs text-slate-500 hidden sm:block">
              할 일과 마감일, 우선순위를 설정해 업무를 추가하세요.
            </p>
          </div>
        </div>
        <span class="text-xs text-slate-400 font-medium hidden sm:inline-block">
          * 필수 입력: 업무명
        </span>
      </div>

      <form id="task-add-form" novalidate>
        <!-- Task Title Field -->
        <div class="mb-4">
          <label for="input-task-title" class="block text-sm font-bold text-slate-800 mb-2">
            업무명 <span class="text-rose-500 font-bold">*</span>
          </label>
          <input
            id="input-task-title"
            type="text"
            placeholder="해야 할 업무명을 입력하세요 (예: 2분기 예산안 검토 및 승인 요청)"
            class="w-full px-4 py-3 sm:py-3.5 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 bg-slate-50/70 rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-100 transition-all font-medium"
          />
          <div id="title-error-msg" class="hidden mt-2 px-3 py-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
            <svg class="w-4 h-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"></circle><path stroke-linecap="round" stroke-width="2" d="M12 8v4m0 4h.01"></path></svg>
            <span id="title-error-text">업무명을 입력해주세요. 공백만으로는 등록할 수 없습니다.</span>
          </div>
        </div>

        <!-- Priority & Due Date Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5 pt-3 border-t border-slate-100">
          <!-- Priority Selector -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="block text-xs font-bold text-slate-700 tracking-wide">
                우선순위 선택 <span class="text-slate-400 font-normal">(기본값: 보통)</span>
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2" role="group" aria-label="우선순위 선택">
              ${['high', 'medium', 'low']
                .map((p) => {
                  const meta = PRIORITY_META[p];
                  const isSelected = state.inputPriority === p;
                  return `
                    <button
                      type="button"
                      data-priority="${p}"
                      class="priority-select-btn min-h-[46px] flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        isSelected
                          ? meta.ringActive
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }"
                    >
                      <span class="w-2.5 h-2.5 rounded-full shrink-0 ${meta.dotClass}"></span>
                      <span>${meta.label}</span>
                      ${isSelected ? `<svg class="w-3.5 h-3.5 shrink-0 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>` : ''}
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <!-- Due Date Selector -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label for="input-task-duedate" class="block text-xs font-bold text-slate-700 tracking-wide">
                마감일 설정 <span class="text-slate-400 font-normal">(선택사항)</span>
              </label>
              ${
                state.inputDueDate
                  ? `<button type="button" id="btn-clear-date" class="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> 마감일 없음으로 변경
                     </button>`
                  : `<span class="text-xs text-slate-400 font-medium">마감일 없음 (선택안함)</span>`
              }
            </div>

            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"></rect><path stroke-linecap="round" stroke-width="2" d="M16 2v4M8 2v4M3 10h18"></path></svg>
              </div>
              <input
                id="input-task-duedate"
                type="date"
                value="${state.inputDueDate}"
                class="w-full min-h-[46px] pl-10 pr-3 py-2 text-sm rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition cursor-pointer"
              />
            </div>

            <!-- Quick Date Chips -->
            <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span class="text-xs text-slate-400 font-medium mr-1">빠른선택:</span>
              <button
                type="button"
                id="btn-quick-today"
                class="text-xs px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                  isTodaySelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }"
              >
                오늘
              </button>
              <button
                type="button"
                id="btn-quick-tomorrow"
                class="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 font-medium transition cursor-pointer"
              >
                내일
              </button>
              <button
                type="button"
                id="btn-quick-friday"
                class="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 font-medium transition cursor-pointer"
              >
                이번 주 금요일
              </button>
              ${
                state.inputDueDate
                  ? `<button type="button" id="btn-quick-clear" class="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-medium transition cursor-pointer">지우기</button>`
                  : ''
              }
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end">
          <button
            type="submit"
            class="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-hidden focus:ring-4 focus:ring-blue-200"
          >
            <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
            <span>업무 등록하기</span>
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderStatsBanner() {
  const total = state.tasks.length;
  if (total === 0) return '';

  const completedCount = state.tasks.filter((t) => t.completed).length;
  const inProgressCount = total - completedCount;
  const todayCount = state.tasks.filter((t) => getTaskStatus(t) === 'due_today').length;
  const overdueCount = state.tasks.filter((t) => getTaskStatus(t) === 'overdue').length;
  const completionRate = Math.round((completedCount / total) * 100);

  return `
    <div class="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 mb-8 shadow-xs">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3.5">
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
          </div>
          <div>
            <div class="text-xs text-slate-500 font-medium">진행 중 / 전체</div>
            <div class="text-lg font-bold text-slate-800">
              <span class="text-blue-600">${inProgressCount}</span>
              <span class="text-slate-400 font-normal text-sm"> / ${total}</span>
            </div>
          </div>
        </div>

        <div class="rounded-xl p-3 border flex items-center gap-3 transition-colors ${
          todayCount > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'
        }">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            todayCount > 0 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'
          }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"></circle><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l3 3"></path></svg>
          </div>
          <div>
            <div class="text-xs text-slate-500 font-medium">오늘 마감</div>
            <div class="text-lg font-bold ${todayCount > 0 ? 'text-amber-700' : 'text-slate-800'}">
              ${todayCount}건
            </div>
          </div>
        </div>

        <div class="rounded-xl p-3 border flex items-center gap-3 transition-colors ${
          overdueCount > 0 ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-100 text-slate-700'
        }">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            overdueCount > 0 ? 'bg-rose-200 text-rose-800' : 'bg-slate-200 text-slate-600'
          }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <div class="text-xs text-slate-500 font-medium">기한 지남</div>
            <div class="text-lg font-bold ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-800'}">
              ${overdueCount}건
            </div>
          </div>
        </div>

        <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <div class="text-xs text-slate-500 font-medium">완료됨</div>
            <div class="text-lg font-bold text-emerald-600">
              ${completedCount}건 <span class="text-xs font-normal text-slate-500">(${completionRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="flex justify-between items-center text-xs text-slate-500 mb-1.5 font-medium">
          <span>달성률</span>
          <span class="text-slate-700 font-semibold">${completionRate}% 완료</span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style="width: ${completionRate}%"></div>
        </div>
      </div>
    </div>
  `;
}

function renderTaskItem(task) {
  const isEditing = state.editingTaskId === task.id;
  const status = getTaskStatus(task);
  const badgeInfo = getDueDateBadgeInfo(task);
  const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;

  if (isEditing) {
    const editState = state.editFormState;
    return `
      <div class="bg-white rounded-2xl border-2 border-blue-500/50 p-4 sm:p-5 shadow-sm">
        <div class="mb-3.5">
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            업무명 수정 <span class="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="edit-input-title"
            value="${escapeHtml(editState.title)}"
            class="w-full px-3.5 py-2.5 text-base rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-100 font-medium"
            autofocus
          />
          ${
            editState.error
              ? `<p class="text-xs text-rose-600 font-semibold mt-1.5">${editState.error}</p>`
              : ''
          }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
          <div>
            <span class="block text-xs font-bold text-slate-700 mb-1.5">우선순위</span>
            <div class="grid grid-cols-3 gap-2">
              ${['high', 'medium', 'low']
                .map((p) => {
                  const cfg = PRIORITY_META[p];
                  const isSel = editState.priority === p;
                  return `
                    <button
                      type="button"
                      data-edit-priority="${p}"
                      class="edit-priority-btn min-h-[42px] py-1.5 px-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSel
                          ? cfg.ringActive
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }"
                    >
                      <span class="w-2 h-2 rounded-full ${cfg.dotClass}"></span>
                      <span>${cfg.label}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-slate-700">마감일</span>
              ${
                editState.dueDate
                  ? `<button type="button" id="btn-edit-clear-date" class="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline">마감일 제거</button>`
                  : ''
              }
            </div>
            <input
              type="date"
              id="edit-input-date"
              value="${editState.dueDate}"
              class="w-full min-h-[42px] px-3 py-1.5 text-sm rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-4 focus:ring-blue-100 cursor-pointer font-medium"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            id="btn-cancel-edit"
            class="min-h-[40px] px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            id="btn-save-edit"
            data-task-id="${task.id}"
            class="min-h-[40px] px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
            <span>수정 완료</span>
          </button>
        </div>
      </div>
    `;
  }

  // Normal View
  return `
    <article
      data-id="${task.id}"
      class="group relative bg-white rounded-2xl border-2 transition-all duration-200 ${
        task.completed
          ? 'border-slate-200 bg-slate-50/60 shadow-none'
          : status === 'overdue'
          ? 'border-rose-200 shadow-xs hover:border-rose-400 hover:shadow-md'
          : status === 'due_today'
          ? 'border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md'
          : 'border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md'
      }"
    >
      <div class="p-4 sm:p-5">
        <div class="flex items-start gap-3.5 sm:gap-4">
          <!-- Completion Checkbox (Prominent 28px, accessible touch) -->
          <button
            type="button"
            data-action="toggle"
            data-task-id="${task.id}"
            aria-label="${task.completed ? '완료 취소' : '업무 완료'}"
            class="btn-toggle-complete mt-0.5 shrink-0 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer focus:outline-hidden focus:ring-4 focus:ring-blue-200 ${
              task.completed
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/50 text-transparent'
            }"
          >
            <svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </button>

          <!-- Task Body -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <h3
                data-action="toggle"
                data-task-id="${task.id}"
                class="text-base sm:text-lg font-bold sm:font-semibold leading-relaxed sm:leading-snug break-words cursor-pointer select-none transition-colors ${
                  task.completed
                    ? 'line-through text-slate-400 decoration-slate-400 decoration-2'
                    : 'text-slate-900 hover:text-blue-600'
                }"
              >
                ${escapeHtml(task.title)}
              </h3>

              <!-- Desktop Action Buttons -->
              <div class="hidden sm:flex items-center gap-1 shrink-0 -mt-1 -mr-1">
                <button
                  type="button"
                  data-action="edit"
                  data-task-id="${task.id}"
                  title="업무 수정"
                  class="btn-edit-task w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button
                  type="button"
                  data-action="delete"
                  data-task-id="${task.id}"
                  title="업무 삭제"
                  class="btn-delete-task w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </div>

            <!-- Metadata Row -->
            <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <div class="flex flex-wrap items-center gap-2">
                <!-- Priority Badge (Color + Text) -->
                <span class="inline-flex items-center gap-1.5 rounded-md border shrink-0 px-2.5 py-0.5 text-xs ${priorityMeta.badgeClass}">
                  <span class="w-2 h-2 rounded-full shrink-0 ${priorityMeta.dotClass}"></span>
                  <span>${priorityMeta.label}</span>
                </span>

                <!-- Status Badge -->
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${badgeInfo.badgeClass}">
                  ${badgeInfo.iconHtml}
                  <span>${badgeInfo.label}</span>
                  ${badgeInfo.subLabel ? `<span class="opacity-80 font-normal">(${badgeInfo.subLabel})</span>` : ''}
                </span>

                <!-- Due Date Badge -->
                <span class="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                  <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"></rect><path stroke-linecap="round" stroke-width="2" d="M16 2v4M8 2v4M3 10h18"></path></svg>
                  <span class="${status === 'overdue' ? 'font-bold text-rose-700' : ''}">
                    ${formatDueDateDisplay(task.dueDate)}
                  </span>
                </span>
              </div>

              <!-- Mobile Actions (Never crushed on phones) -->
              <div class="flex sm:hidden items-center gap-2 ml-auto shrink-0">
                <button
                  type="button"
                  data-action="edit"
                  data-task-id="${task.id}"
                  class="btn-edit-task min-h-[34px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  <span>수정</span>
                </button>
                <button
                  type="button"
                  data-action="delete"
                  data-task-id="${task.id}"
                  class="btn-delete-task min-h-[34px] px-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  <span>삭제</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderTaskListSection() {
  const tasks = state.tasks;

  if (tasks.length === 0) {
    return `
      <section aria-label="업무 목록 영역" class="mt-8">
        <div class="flex items-center gap-2 mb-4 px-1">
          <div class="w-2.5 h-6 bg-blue-600 rounded-full"></div>
          <h2 class="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            내 업무 목록
          </h2>
        </div>
        <div class="bg-white rounded-2xl border-2 border-slate-200 p-8 sm:p-14 text-center shadow-xs">
          <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <svg class="w-8 h-8 stroke-[1.75]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
          </div>
          <h3 class="text-lg sm:text-xl font-bold text-slate-900 mb-2">
            등록된 업무가 없습니다
          </h3>
          <p class="text-sm sm:text-base text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            상단 <strong>새 업무 등록</strong> 영역에 해야 할 일과 마감일을 입력하고 등록해 보세요.
          </p>
          <div class="inline-flex items-center gap-2 text-xs sm:text-sm text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 font-medium">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"></circle><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l3 3"></path></svg>
            <span>마감일과 우선순위는 등록 후에도 언제든 수정할 수 있습니다</span>
          </div>
        </div>
      </section>
    `;
  }

  // Calculate tab counts
  const counts = {
    all: tasks.length,
    active: tasks.filter((t) => !t.completed).length,
    today: tasks.filter((t) => !t.completed && getTaskStatus(t) === 'due_today').length,
    overdue: tasks.filter((t) => !t.completed && getTaskStatus(t) === 'overdue').length,
    completed: tasks.filter((t) => t.completed).length,
  };

  // Filter & Sort
  let displayTasks = [...tasks];
  if (state.filter === 'active') {
    displayTasks = displayTasks.filter((t) => !t.completed);
  } else if (state.filter === 'today') {
    displayTasks = displayTasks.filter((t) => !t.completed && getTaskStatus(t) === 'due_today');
  } else if (state.filter === 'overdue') {
    displayTasks = displayTasks.filter((t) => !t.completed && getTaskStatus(t) === 'overdue');
  } else if (state.filter === 'completed') {
    displayTasks = displayTasks.filter((t) => t.completed);
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    displayTasks = displayTasks.filter((t) => t.title.toLowerCase().includes(q));
  }

  const priorityWeight = { high: 3, medium: 2, low: 1 };
  displayTasks.sort((a, b) => {
    if (state.filter === 'all' && a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    if (state.sortBy === 'dueDateAsc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (state.sortBy === 'dueDateDesc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return b.dueDate.localeCompare(a.dueDate);
    }
    if (state.sortBy === 'priorityDesc') {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    if (state.sortBy === 'createdDesc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  return `
    <section aria-label="업무 목록 영역" class="mt-8 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 px-1">
        <div class="flex items-center gap-2.5">
          <div class="w-2.5 h-6 bg-blue-600 rounded-full"></div>
          <h2 class="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            내 업무 목록
          </h2>
          <span class="text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            총 ${tasks.length}개
          </span>
        </div>
      </div>

      <!-- Control Box -->
      <div class="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        <!-- Filter Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            data-filter="all"
            class="filter-tab-btn min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              state.filter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }"
          >
            <span>전체</span>
            <span class="text-xs px-1.5 py-0.2 rounded-full font-bold ${
              state.filter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }">${counts.all}</span>
          </button>

          <button
            type="button"
            data-filter="active"
            class="filter-tab-btn min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              state.filter === 'active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }"
          >
            <span>미완료</span>
            <span class="text-xs px-1.5 py-0.2 rounded-full font-bold ${
              state.filter === 'active' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }">${counts.active}</span>
          </button>

          <button
            type="button"
            data-filter="today"
            class="filter-tab-btn min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              state.filter === 'today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }"
          >
            <span>오늘 마감</span>
            ${
              counts.today > 0
                ? `<span class="text-xs px-1.5 py-0.2 rounded-full font-bold ${
                    state.filter === 'today' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
                  }">${counts.today}</span>`
                : ''
            }
          </button>

          <button
            type="button"
            data-filter="overdue"
            class="filter-tab-btn min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              state.filter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }"
          >
            <span>기한 지남</span>
            ${
              counts.overdue > 0
                ? `<span class="text-xs px-1.5 py-0.2 rounded-full font-bold ${
                    state.filter === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-900'
                  }">${counts.overdue}</span>`
                : ''
            }
          </button>

          <button
            type="button"
            data-filter="completed"
            class="filter-tab-btn min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              state.filter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }"
          >
            <span>완료됨</span>
            <span class="text-xs px-1.5 py-0.2 rounded-full font-bold ${
              state.filter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }">${counts.completed}</span>
          </button>
        </div>

        <!-- Search & Sort Row -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div class="relative flex-1">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"></circle><path stroke-linecap="round" stroke-width="2" d="M21 21l-4.35-4.35"></path></svg>
            <input
              id="filter-search-input"
              type="text"
              value="${escapeHtml(state.searchQuery)}"
              placeholder="업무명으로 검색..."
              class="w-full min-h-[42px] pl-10 pr-10 text-sm font-medium rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
            />
            ${
              state.searchQuery
                ? `<button type="button" id="btn-clear-search" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer">지우기</button>`
                : ''
            }
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M6 10h12M9 16h6"></path></svg>
              <span>정렬:</span>
            </span>
            <select
              id="sort-select"
              class="w-full sm:w-auto min-h-[42px] text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="dueDateAsc" ${state.sortBy === 'dueDateAsc' ? 'selected' : ''}>마감일 빠른 순</option>
              <option value="dueDateDesc" ${state.sortBy === 'dueDateDesc' ? 'selected' : ''}>마감일 늦은 순</option>
              <option value="priorityDesc" ${state.sortBy === 'priorityDesc' ? 'selected' : ''}>우선순위 높은 순</option>
              <option value="createdDesc" ${state.sortBy === 'createdDesc' ? 'selected' : ''}>최근 등록 순</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Task Items List -->
      ${
        displayTasks.length === 0
          ? `
            <div class="bg-white rounded-2xl border-2 border-slate-200 p-8 sm:p-10 text-center shadow-xs">
              <p class="text-base text-slate-600 font-medium mb-3">
                ${
                  state.searchQuery
                    ? `"${escapeHtml(state.searchQuery)}" 검색어와 일치하는 업무가 없습니다.`
                    : '현재 선택한 탭 조건에 해당하는 업무가 없습니다.'
                }
              </p>
              <button
                type="button"
                id="btn-reset-filters"
                class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
              >
                <span>전체 업무 목록 보기로 초기화</span>
              </button>
            </div>
          `
          : `
            <div class="space-y-3 sm:space-y-3.5">
              ${displayTasks.map((t) => renderTaskItem(t)).join('')}
            </div>
          `
      }
    </section>
  `;
}

function renderUndoToast() {
  if (!state.undoToast) return '';
  return `
    <div class="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 p-3.5 flex items-center justify-between gap-3 animate-slideUp">
      <div class="text-xs sm:text-sm truncate">
        <span class="font-medium text-slate-300">업무가 삭제되었습니다: </span>
        <span class="text-white font-semibold">"${escapeHtml(state.undoToast.task.title)}"</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          id="btn-undo-delete"
          class="px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition flex items-center gap-1 cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l6-6M3 10l6 6"></path></svg>
          <span>실행 취소</span>
        </button>
        <button
          type="button"
          id="btn-dismiss-undo"
          class="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="mt-auto py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
      <div class="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>내 업무 플래너 &copy; ${new Date().getFullYear()}</span>
        <span class="text-slate-400">
          데이터는 브라우저 내부(localStorage)에 안전하게 보관됩니다.
        </span>
      </div>
    </footer>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   Main Application Render
============================================================ */

function renderApp() {
  const root = document.getElementById('root');
  if (!root) return;

  // Preserve input title if user was typing
  const currentTitleInput = document.getElementById('input-task-title');
  const savedInputValue = currentTitleInput ? currentTitleInput.value : '';

  root.innerHTML = `
    <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
      ${renderHeader()}
      <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:px-6 sm:py-8">
        ${renderStorageErrorBanner()}
        ${renderInputSection()}
        ${renderStatsBanner()}
        ${renderTaskListSection()}
      </main>
      ${renderUndoToast()}
      ${renderFooter()}
    </div>
  `;

  // Restore input title if not submitting
  const newTitleInput = document.getElementById('input-task-title');
  if (newTitleInput && savedInputValue) {
    newTitleInput.value = savedInputValue;
  }

  attachEventListeners();
}

/* ============================================================
   Event Handlers and Binding
============================================================ */

function attachEventListeners() {
  // 1. Task Add Form Submit
  const form = document.getElementById('task-add-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('input-task-title');
      const titleErrorMsg = document.getElementById('title-error-msg');
      const val = titleInput ? titleInput.value : '';

      // Check whitespace-only or empty
      if (!val || !val.trim()) {
        if (titleErrorMsg) {
          titleErrorMsg.classList.remove('hidden');
        }
        if (titleInput) {
          titleInput.classList.remove('border-slate-200');
          titleInput.classList.add('border-rose-400', 'bg-rose-50/20');
          titleInput.focus();
        }
        return;
      }

      // Hide error
      if (titleErrorMsg) titleErrorMsg.classList.add('hidden');

      const newTask = {
        id: generateTaskId(),
        title: val.trim(),
        priority: state.inputPriority,
        dueDate: state.inputDueDate || null,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };

      // Reset form state
      state.inputPriority = 'medium';
      state.inputDueDate = '';

      updateTasks([newTask, ...state.tasks]);

      // Focus input again
      const resetInput = document.getElementById('input-task-title');
      if (resetInput) {
        resetInput.value = '';
        resetInput.focus();
      }
    });
  }

  // Input typing clears error
  const titleInput = document.getElementById('input-task-title');
  if (titleInput) {
    titleInput.addEventListener('input', (e) => {
      if (e.target.value.trim()) {
        const errorMsg = document.getElementById('title-error-msg');
        if (errorMsg) errorMsg.classList.add('hidden');
        titleInput.classList.remove('border-rose-400', 'bg-rose-50/20');
        titleInput.classList.add('border-slate-200');
      }
    });
  }

  // Priority select buttons in input form
  document.querySelectorAll('.priority-select-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.inputPriority = btn.getAttribute('data-priority');
      renderApp();
    });
  });

  // Due date input
  const dateInput = document.getElementById('input-task-duedate');
  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      state.inputDueDate = e.target.value;
      renderApp();
    });
  }

  // Quick Date Chips
  const btnQuickToday = document.getElementById('btn-quick-today');
  if (btnQuickToday) {
    btnQuickToday.addEventListener('click', () => {
      state.inputDueDate = getLocalTodayString();
      renderApp();
    });
  }

  const btnQuickTomorrow = document.getElementById('btn-quick-tomorrow');
  if (btnQuickTomorrow) {
    btnQuickTomorrow.addEventListener('click', () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      state.inputDueDate = `${y}-${m}-${day}`;
      renderApp();
    });
  }

  const btnQuickFriday = document.getElementById('btn-quick-friday');
  if (btnQuickFriday) {
    btnQuickFriday.addEventListener('click', () => {
      const d = new Date();
      const dayOfWeek = d.getDay();
      let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
      if (daysUntilFriday === 0) daysUntilFriday = 7;
      d.setDate(d.getDate() + daysUntilFriday);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      state.inputDueDate = `${y}-${m}-${day}`;
      renderApp();
    });
  }

  const btnClearDate = document.getElementById('btn-clear-date');
  if (btnClearDate) {
    btnClearDate.addEventListener('click', () => {
      state.inputDueDate = '';
      renderApp();
    });
  }

  const btnQuickClear = document.getElementById('btn-quick-clear');
  if (btnQuickClear) {
    btnQuickClear.addEventListener('click', () => {
      state.inputDueDate = '';
      renderApp();
    });
  }

  // Filter tabs
  document.querySelectorAll('.filter-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.getAttribute('data-filter');
      renderApp();
    });
  });

  // Search input
  const searchInput = document.getElementById('filter-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderApp();
      // Keep cursor focus
      const updatedSearch = document.getElementById('filter-search-input');
      if (updatedSearch) {
        updatedSearch.focus();
        updatedSearch.setSelectionRange(updatedSearch.value.length, updatedSearch.value.length);
      }
    });
  }

  const btnClearSearch = document.getElementById('btn-clear-search');
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      state.searchQuery = '';
      renderApp();
    });
  }

  const btnResetFilters = document.getElementById('btn-reset-filters');
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      state.filter = 'all';
      state.searchQuery = '';
      renderApp();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderApp();
    });
  }

  // Toggle complete
  document.querySelectorAll('[data-action="toggle"]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-task-id');
      const updated = state.tasks.map((t) => {
        if (t.id === id) {
          const willComplete = !t.completed;
          return {
            ...t,
            completed: willComplete,
            completedAt: willComplete ? new Date().toISOString() : null,
          };
        }
        return t;
      });
      updateTasks(updated);
    });
  });

  // Delete task (선택한 항목만 삭제 + 6s undo toast)
  document.querySelectorAll('.btn-delete-task').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-task-id');
      const taskToDelete = state.tasks.find((t) => t.id === id);
      if (!taskToDelete) return;

      if (state.undoToast) {
        clearTimeout(state.undoToast.timerId);
      }

      const timerId = setTimeout(() => {
        state.undoToast = null;
        renderApp();
      }, 6000);

      state.undoToast = {
        task: taskToDelete,
        timerId,
      };

      const remaining = state.tasks.filter((t) => t.id !== id);
      updateTasks(remaining);
    });
  });

  // Undo delete
  const btnUndoDelete = document.getElementById('btn-undo-delete');
  if (btnUndoDelete) {
    btnUndoDelete.addEventListener('click', () => {
      if (!state.undoToast) return;
      clearTimeout(state.undoToast.timerId);
      const restored = state.undoToast.task;
      state.undoToast = null;
      updateTasks([restored, ...state.tasks]);
    });
  }

  const btnDismissUndo = document.getElementById('btn-dismiss-undo');
  if (btnDismissUndo) {
    btnDismissUndo.addEventListener('click', () => {
      if (state.undoToast) {
        clearTimeout(state.undoToast.timerId);
        state.undoToast = null;
        renderApp();
      }
    });
  }

  // Start edit task
  document.querySelectorAll('.btn-edit-task').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-task-id');
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;

      state.editingTaskId = id;
      state.editFormState = {
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate || '',
        error: null,
      };
      renderApp();
    });
  });

  // Edit priority buttons
  document.querySelectorAll('.edit-priority-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-edit-priority');
      state.editFormState.priority = p;
      const titleEl = document.getElementById('edit-input-title');
      if (titleEl) state.editFormState.title = titleEl.value;
      const dateEl = document.getElementById('edit-input-date');
      if (dateEl) state.editFormState.dueDate = dateEl.value;
      renderApp();
    });
  });

  const btnEditClearDate = document.getElementById('btn-edit-clear-date');
  if (btnEditClearDate) {
    btnEditClearDate.addEventListener('click', () => {
      state.editFormState.dueDate = '';
      const titleEl = document.getElementById('edit-input-title');
      if (titleEl) state.editFormState.title = titleEl.value;
      renderApp();
    });
  }

  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
      state.editingTaskId = null;
      renderApp();
    });
  }

  const btnSaveEdit = document.getElementById('btn-save-edit');
  if (btnSaveEdit) {
    btnSaveEdit.addEventListener('click', () => {
      const id = btnSaveEdit.getAttribute('data-task-id');
      const titleEl = document.getElementById('edit-input-title');
      const dateEl = document.getElementById('edit-input-date');

      const title = titleEl ? titleEl.value.trim() : '';
      if (!title) {
        state.editFormState.error = '업무명을 입력해주세요. 공백만으로는 등록할 수 없습니다.';
        renderApp();
        return;
      }

      const dueDate = dateEl ? dateEl.value || null : null;
      const updated = state.tasks.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            title,
            priority: state.editFormState.priority,
            dueDate,
          };
        }
        return t;
      });

      state.editingTaskId = null;
      updateTasks(updated);
    });
  }

  // Storage error dismiss
  const btnDismissStorageError = document.getElementById('btn-dismiss-storage-error');
  if (btnDismissStorageError) {
    btnDismissStorageError.addEventListener('click', () => {
      state.storageError = null;
      renderApp();
    });
  }
}

/* ============================================================
   Initialization
============================================================ */

function init() {
  // Load tasks from localStorage (defaults to empty array, no fake sample data)
  state.tasks = loadTasks();
  renderApp();
}

// Start application
init();
