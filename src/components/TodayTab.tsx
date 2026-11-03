/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  Flame,
  Check,
} from 'lucide-react';
import { QuranPlanSeed, RecitationEvent, OldCycleState, PlanDay } from '../types/quranPlan';
import {
  todayInRiyadh,
  addDays,
  daysBetween,
  computeProgress,
  computeReviews,
  getPageContentSummary,
  passed,
  getEligibleOldCyclePages,
  ReviewTask,
} from '../lib/hifzCore';

interface TodayTabProps {
  currentDate: string;
  setCurrentDate: (d: string) => void;
  seed: QuranPlanSeed;
  events: RecitationEvent[];
  oldCycle: OldCycleState;
  onOpenRecitation: (page: number, defaultType?: 'new' | 'review' | 'old' | 'consolidation') => void;
  onAdvanceOldCycle: (pagesCompleted: number[]) => void;
  dailyAvailableMinutes: number;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  currentDate,
  setCurrentDate,
  seed,
  events,
  oldCycle,
  onOpenRecitation,
  onAdvanceOldCycle,
  dailyAvailableMinutes,
}) => {
  const actualToday = todayInRiyadh();
  const isActualToday = currentDate === actualToday;

  // Day data from plan
  const planDay: PlanDay | undefined = seed.plan.days.find(d => d.date === currentDate);

  // Yesterday's date and day
  const yesterdayDate = addDays(currentDate, -1);
  const yesterdayPlanDay = seed.plan.days.find(d => d.date === yesterdayDate);

  // Reviews due as of currentDate
  const reviewsResult = useMemo(
    () => computeReviews(seed, events, currentDate),
    [seed, events, currentDate]
  );

  // Progress as of currentDate
  const progressResult = useMemo(
    () => computeProgress(seed, events, currentDate),
    [seed, events, currentDate]
  );

  // Separate today's tasks from overdue tasks
  const tasksDueToday: ReviewTask[] = [];
  const tasksOverdue: ReviewTask[] = [];

  for (const t of reviewsResult.tasks) {
    if (t.earliestDueDate < currentDate) {
      tasksOverdue.push(t);
    } else {
      tasksDueToday.push(t);
    }
  }

  // Yesterday's new pages to verify
  const yesterdayNewPages = yesterdayPlanDay?.newPages ?? [];
  const yesterdayCheckedPages = yesterdayNewPages.filter(p => {
    const list = events.filter(e => e.page === p && e.date === currentDate && e.type !== 'new');
    return list.some(passed);
  });

  // Today's old cycle window (15 pages starting from pointer)
  const eligibleOldPages = useMemo(
    () => getEligibleOldCyclePages(seed, events, currentDate),
    [seed, events, currentDate]
  );

  const oldCycleBatch = useMemo(() => {
    const total = eligibleOldPages.length;
    if (total === 0) return [];
    const startIndex = Math.max(0, (oldCycle.currentPointerPage - 1) % total);
    const pages: number[] = [];
    for (let i = 0; i < 15; i++) {
      const idx = (startIndex + i) % total;
      pages.push(eligibleOldPages[idx]);
    }
    return pages;
  }, [eligibleOldPages, oldCycle.currentPointerPage]);

  // Check which pages of oldCycleBatch have been recited today
  const oldCycleDoneToday = useMemo(() => {
    return oldCycleBatch.filter(p => {
      return events.some(e => e.page === p && e.date === currentDate && passed(e));
    });
  }, [oldCycleBatch, events, currentDate]);

  // Estimated vs Actual time today
  const actualMinutesToday = useMemo(() => {
    return events
      .filter(e => e.date === currentDate && !e.voided)
      .reduce((sum, e) => sum + (e.timeMinutes ?? 0), 0);
  }, [events, currentDate]);

  const estimatedMinutesToday = useMemo(() => {
    let mins = 0;
    if (planDay?.newPages?.length) {
      mins += planDay.newPages.length * 20; // 20 mins per new page
    }
    mins += tasksDueToday.length * 2; // 2 mins per review page
    mins += tasksOverdue.length * 2;
    if (oldCycleBatch.length) {
      mins += 30; // ~30 mins for 15 pages old cycle
    }
    mins += 10; // error log / checking
    return mins;
  }, [planDay, tasksDueToday.length, tasksOverdue.length, oldCycleBatch.length]);

  return (
    <div className="space-y-6">
      {/* Date Navigation Strip */}
      <div className="bg-white rounded-2xl p-4 border border-[#e8e3d5] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -1))}
            className="p-1.5 rounded-lg border border-[#d8d2c4] hover:bg-[#f4f0e6] text-[#12372a] transition-colors"
            title="اليوم السابق"
            aria-label="اليوم السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#fbf9f4] border border-[#e8e3d5]">
            <Calendar className="w-4 h-4 text-[#c59b27]" aria-hidden="true" />
            <input
              type="date"
              value={currentDate}
              onChange={e => e.target.value && setCurrentDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-[#12372a] focus:outline-none cursor-pointer"
            />
            {planDay && (
              <span className="text-xs text-[#526359] border-r border-[#d8d2c4] pr-2 mr-1">
                {planDay.weekdayAr}
              </span>
            )}
          </div>

          <button
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
            className="p-1.5 rounded-lg border border-[#d8d2c4] hover:bg-[#f4f0e6] text-[#12372a] transition-colors"
            title="اليوم التالي"
            aria-label="اليوم التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {!isActualToday && (
            <button
              onClick={() => setCurrentDate(actualToday)}
              className="text-xs font-medium text-[#1b4d36] bg-[#e8f2ec] hover:bg-[#d5e7dd] px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              العودة لليوم الفعلي
            </button>
          )}
        </div>

        {/* Day Classification Badge */}
        {planDay ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6f7e75]">الأسبوع {planDay.week}</span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                planDay.type === 'new'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : planDay.type === 'review'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : planDay.type === 'flex'
                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {planDay.type === 'new' && 'يوم حفظ جديد ومراجعة'}
              {planDay.type === 'review' && 'يوم مراجعة فقط (الثلاثاء)'}
              {planDay.type === 'flex' && 'يوم مرن وراحة من الجديد'}
              {planDay.type === 'consolidation' && 'جولة التثبيت الختامية'}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#8c9c91]">خارج نطاق خطة الحفظ الرسمية</span>
        )}
      </div>

      {/* Yesterday's Recall Check Alert (If yesterday had new pages) */}
      {yesterdayNewPages.length > 0 && (
        <div className="bg-[#fefcf6] border border-[#e5dcbe] rounded-2xl p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#c59b27]/15 text-[#9a781b] mt-0.5">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#12372a] font-cairo">
                  شرط اعتماد الحفظ: تسميع حفظ الأمس غيبًا أولاً
                </h3>
                <p className="text-xs text-[#526359] mt-0.5 leading-relaxed">
                  ورد الأمس كان الأوجه ({yesterdayNewPages.join('، ')}). التسميع الناجح اليوم على فاصل تقويمي يعتمد تلك الصفحات ويثبتها في إنجازك.
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {yesterdayNewPages.map(page => {
                    const isChecked = yesterdayCheckedPages.includes(page);
                    return (
                      <button
                        key={page}
                        onClick={() => onOpenRecitation(page, 'review')}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-[#c59b27]/40 text-[#12372a] hover:bg-[#fbf7ea]'
                        }`}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[#c59b27]" />
                        )}
                        وجه {page}
                        <span className="text-[10px] text-[#6f7e75]">
                          {isChecked ? 'تم اعتماده اليوم' : 'سمّع الآن'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Tasks Alert (if any) */}
      {tasksOverdue.length > 0 && (
        <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-red-950 font-cairo">
                  مراجعات متأخرة فائتة ({tasksOverdue.length} أوجه)
                </h3>
                <span className="text-[11px] font-semibold text-red-700">الأولوية لسدادها قبل الجديد</span>
              </div>
              <p className="text-xs text-red-800 mt-0.5">
                هذه الصفحات انقضى استحقاقها المتباعد في أيام سابقة ولم تُسمّع بعد:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                {tasksOverdue.map(t => (
                  <div
                    key={t.page}
                    className="bg-white p-2.5 rounded-xl border border-red-200 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#12372a]">وجه {t.page}</div>
                      <div className="text-[10px] text-red-700">
                        استحقاق {t.earliestDueDate} ({t.ageDays} يوم مضى) · {t.reasons.join('، ')}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenRecitation(t.page, 'review')}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      تسميع
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: New Memorization + Spaced Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Right / Main Column: New Memorization */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Today's New Pages */}
          <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f0ebd9]">
              <div>
                <h2 className="text-base font-bold text-[#12372a] flex items-center gap-2 font-cairo">
                  <Sparkles className="w-4 h-4 text-[#c59b27]" />
                  حفظ اليوم الجديد
                </h2>
                <p className="text-xs text-[#6f7e75] mt-0.5">
                  {planDay?.newPages?.length
                    ? `${planDay.newPages.length} أوجه مقررة لليوم (الحد الأقصى ٤ أوجه)`
                    : 'لا يوجد حفظ جديد مقرر لهذا اليوم'}
                </p>
              </div>

              {planDay?.newPages && planDay.newPages.length > 0 && (
                <span className="text-xs text-[#c59b27] font-semibold bg-[#fbf7ea] px-2.5 py-1 rounded-lg border border-[#c59b27]/30">
                  سقف ٤ أوجه
                </span>
              )}
            </div>

            {planDay?.newPages && planDay.newPages.length > 0 ? (
              <div className="space-y-3">
                {planDay.newPages.map(page => {
                  const summary = getPageContentSummary(page, seed);
                  const pageEvents = events.filter(e => e.page === page && !e.voided);
                  const firstNewPass = pageEvents.find(e => e.type === 'new' && passed(e));
                  const isApproved = progressResult.approvedPages ?? [];
                  const isPageApproved = isApproved.includes?.(page) || progressResult.contiguousApprovedCount >= (seed.profile.targetPages.indexOf(page) + 1);

                  let statusText = 'لم يُسمّع بعد';
                  let statusBg = 'bg-[#f4f0e6] text-[#526359] border-[#e0d9c8]';

                  if (firstNewPass) {
                    if (isPageApproved) {
                      statusText = 'معتمد وثابت';
                      statusBg = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                    } else {
                      statusText = 'سُمّع بنجاح (قيد التثبيت)';
                      statusBg = 'bg-amber-100 text-amber-900 border-amber-300';
                    }
                  } else {
                    const attemptedToday = pageEvents.find(e => e.date === currentDate);
                    if (attemptedToday && !passed(attemptedToday)) {
                      statusText = 'يحتاج تثبيتًا';
                      statusBg = 'bg-red-100 text-red-900 border-red-300';
                    }
                  }

                  return (
                    <div
                      key={page}
                      className="p-3.5 rounded-xl border border-[#e8e3d5] bg-[#fbf9f4] hover:border-[#c59b27]/50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#12372a]">وجه {page}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${statusBg}`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-xs text-[#526359] font-amiri leading-normal">{summary}</p>
                      </div>

                      <button
                        onClick={() => onOpenRecitation(page, 'new')}
                        className="px-3.5 py-1.5 bg-[#12372a] hover:bg-[#1b4d36] text-[#fbf9f4] text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#c59b27]" />
                        {firstNewPass ? 'تعديل / تسميع' : 'تسجيل التسميع'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-[#fbf9f4] rounded-xl border border-dashed border-[#d8d2c4]">
                <Clock className="w-8 h-8 text-[#c59b27] mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-[#12372a] font-cairo">
                  {planDay?.type === 'review'
                    ? 'يوم الثلاثاء: مراجعة شاملة لجديد الأسبوع'
                    : planDay?.type === 'flex'
                    ? 'يوم مرن: راحة من الجديد وتركيز على المراجعات المستحقة'
                    : planDay?.type === 'consolidation'
                    ? 'فترة التثبيت الختامية للمصحف'
                    : 'لا يوجد ورد جديد مجدول لهذا اليوم'}
                </h4>
                <p className="text-xs text-[#6f7e75] mt-1 max-w-sm mx-auto">
                  استغل هذا اليوم في تثبيت المحفوظ وسداد المراجعات المتباعدة المستحقة وإصلاح المتشابهات.
                </p>
              </div>
            )}
          </div>

          {/* Card: Old Cycle Quota (15 pages) */}
          <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#f0ebd9]">
              <div>
                <h2 className="text-base font-bold text-[#12372a] flex items-center gap-2 font-cairo">
                  <RotateCcw className="w-4 h-4 text-[#c59b27]" />
                  ورد دورة المحفوظ القديم (١٥ وجهاً)
                </h2>
                <p className="text-xs text-[#6f7e75] mt-0.5">
                  الدورة تبدأ من ص ١ إلى ص {eligibleOldPages.length}، بمعدل ١٥ وجهاً يومياً بالترتيب.
                </p>
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#12372a]">
                  {oldCycleDoneToday.length} / 15
                </span>
                <span className="text-[10px] text-[#6f7e75] block">مُنجز اليوم</span>
              </div>
            </div>

            <div className="bg-[#fbf9f4] p-3 rounded-xl border border-[#e8e3d5] mb-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-[#12372a]">
                  المقطع المقرر اليوم: ص {oldCycleBatch[0] ?? 1} إلى ص {oldCycleBatch[oldCycleBatch.length - 1] ?? 15}
                </span>
                <span className="text-[11px] text-[#c59b27] font-medium">
                  الدورة {oldCycle.cycleIteration}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {oldCycleBatch.map(p => {
                  const isDone = oldCycleDoneToday.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => onOpenRecitation(p, 'old')}
                      className={`text-xs w-9 h-8 rounded-lg border font-medium flex items-center justify-center transition-colors ${
                        isDone
                          ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                          : 'bg-white text-[#12372a] border-[#d8d2c4] hover:bg-[#f4f0e6]'
                      }`}
                      title={`وجه ${p} - انقر لتسجيل التسميع`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#6f7e75] text-[11px]">
                المؤشر يتقدم فقط بالتسميع الفعلي الناجح دون مضاعفة تراكمية عند الغياب.
              </span>
              <button
                onClick={() => onAdvanceOldCycle(oldCycleBatch)}
                disabled={oldCycleDoneToday.length === 15}
                className="px-3 py-1.5 bg-[#1b4d36] hover:bg-[#20503b] disabled:bg-[#d8d2c4] text-white font-semibold rounded-lg transition-colors flex items-center gap-1 text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                تسجيل الورد كاملاً (١٥)
              </button>
            </div>
          </div>
        </div>

        {/* Left Column: Due Spaced Reviews + Time Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Due Spaced Reviews Today */}
          <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#f0ebd9]">
              <div>
                <h2 className="text-base font-bold text-[#12372a] flex items-center gap-2 font-cairo">
                  <Clock className="w-4 h-4 text-[#c59b27]" />
                  المراجعة المتباعدة المستحقة اليوم
                </h2>
                <p className="text-xs text-[#6f7e75] mt-0.5">
                  استحقاقات +1، +3، +7، +14، +30 يومًا من تاريخ الحفظ الفعلي
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f4f0e6] text-[#12372a]">
                {tasksDueToday.length} أوجه
              </span>
            </div>

            {tasksDueToday.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {tasksDueToday.map(t => {
                  const summary = getPageContentSummary(t.page, seed);
                  return (
                    <div
                      key={t.page}
                      className="p-3 rounded-xl border border-[#e8e3d5] bg-[#fbf9f4] hover:bg-white transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#12372a]">وجه {t.page}</span>
                          <span className="text-[10px] text-[#9a781b] bg-[#c59b27]/10 px-1.5 py-0.2 rounded font-semibold">
                            {t.reasons.join(' · ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6f7e75] font-amiri line-clamp-1">{summary}</p>
                      </div>

                      <button
                        onClick={() => onOpenRecitation(t.page, 'review')}
                        className="px-3 py-1 bg-[#184a37] hover:bg-[#20503b] text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
                      >
                        تسميع
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 px-3 bg-[#fbf9f4] rounded-xl border border-dashed border-[#d8d2c4]">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5 opacity-90" />
                <h4 className="text-xs font-bold text-[#12372a]">لا توجد مراجعات متباعدة مستحقة اليوم</h4>
                <p className="text-[11px] text-[#6f7e75] mt-0.5">
                  تتولد الاستحقاقات تلقائيًا بعد أول نجاح فعلي لكل وجه جديد.
                </p>
              </div>
            )}
          </div>

          {/* Card: Time Estimate vs Actual */}
          <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs">
            <h3 className="text-sm font-bold text-[#12372a] mb-3 flex items-center gap-2 font-cairo">
              <Clock className="w-4 h-4 text-[#c59b27]" />
              ميزانية الوقت لليوم
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#526359]">الوقت المقدر لجميع مهام اليوم:</span>
                <span className="font-bold text-[#12372a]">{estimatedMinutesToday} دقيقة</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#526359]">الوقت المتاح المعتمد في إعداداتك:</span>
                <span className="font-semibold text-[#12372a]">{dailyAvailableMinutes} دقيقة</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#f0ebd9]">
                <span className="text-[#526359]">الوقت الفعلي المسجل اليوم:</span>
                <span className="font-bold text-emerald-800">{actualMinutesToday} دقيقة</span>
              </div>

              {estimatedMinutesToday > dailyAvailableMinutes && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    التقدير ({estimatedMinutesToday} د) يفوق وقتك المتاح ({dailyAvailableMinutes} د). يُنصح بإتاحة وقت إضافي أو خفض الجديد لحساب جودة المراجعة.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
