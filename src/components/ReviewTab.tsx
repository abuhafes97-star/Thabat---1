/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Flame,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Check,
} from 'lucide-react';
import { QuranPlanSeed, RecitationEvent, OldCycleState } from '../types/quranPlan';
import {
  todayInRiyadh,
  addDays,
  computeReviews,
  computeProgress,
  getPageContentSummary,
  getEligibleOldCyclePages,
  passed,
  ReviewTask,
} from '../lib/hifzCore';

interface ReviewTabProps {
  currentDate: string;
  seed: QuranPlanSeed;
  events: RecitationEvent[];
  oldCycle: OldCycleState;
  onOpenRecitation: (page: number, type?: 'review' | 'old') => void;
  onAdvanceOldCycle: (pages: number[]) => void;
}

export const ReviewTab: React.FC<ReviewTabProps> = ({
  currentDate,
  seed,
  events,
  oldCycle,
  onOpenRecitation,
  onAdvanceOldCycle,
}) => {
  const [subTab, setSubTab] = useState<'due' | 'overdue' | 'upcoming' | 'weak'>('due');

  const reviewsResult = useMemo(
    () => computeReviews(seed, events, currentDate),
    [seed, events, currentDate]
  );

  const progressResult = useMemo(
    () => computeProgress(seed, events, currentDate),
    [seed, events, currentDate]
  );

  // Split tasks
  const dueTodayTasks = reviewsResult.tasks.filter(t => t.earliestDueDate === currentDate);
  const overdueTasks = reviewsResult.tasks.filter(t => t.earliestDueDate < currentDate);

  // Weak pages (approved pages whose latest recitation failed)
  const weakPages = progressResult.weakPages ?? [];

  // Upcoming tasks over the next 7 days
  const upcomingMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (let i = 1; i <= 7; i++) {
      const d = addDays(currentDate, i);
      const res = computeReviews(seed, events, d);
      const pagesDueOnD = res.tasks.filter(t => t.earliestDueDate === d).map(t => t.page);
      if (pagesDueOnD.length > 0) {
        map.set(d, pagesDueOnD);
      }
    }
    return map;
  }, [seed, events, currentDate]);

  // Old Cycle calculations
  const eligibleOldPages = useMemo(
    () => getEligibleOldCyclePages(seed, events, currentDate),
    [seed, events, currentDate]
  );

  const totalEligible = eligibleOldPages.length;
  const cycleDaysEst = Math.ceil(totalEligible / 15);

  const oldCycleBatch = useMemo(() => {
    if (totalEligible === 0) return [];
    const startIndex = Math.max(0, (oldCycle.currentPointerPage - 1) % totalEligible);
    const pages: number[] = [];
    for (let i = 0; i < 15; i++) {
      const idx = (startIndex + i) % totalEligible;
      pages.push(eligibleOldPages[idx]);
    }
    return pages;
  }, [eligibleOldPages, oldCycle.currentPointerPage, totalEligible]);

  const oldCycleDoneToday = useMemo(() => {
    return oldCycleBatch.filter(p => {
      return events.some(e => e.page === p && e.date === currentDate && passed(e));
    });
  }, [oldCycleBatch, events, currentDate]);

  // Weak pages pause alert check (if >=2 weak pages exist)
  const showInterventionAdvice = weakPages.length >= 2;

  return (
    <div className="space-y-6">
      {/* Metrics Row: Two independent metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Executed reviews rate */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e3d5] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#526359] mb-1">
            <span>نسبة الاستحقاقات المنفذة</span>
            <span className="text-[10px] text-[#7d8c82]">المنفذ ÷ المستحق</span>
          </div>
          <div className="text-xl font-bold text-[#12372a]">
            {reviewsResult.completionPercent !== null
              ? `${reviewsResult.completionPercent}%`
              : 'لا استحقاقات'}
          </div>
          <div className="text-[11px] text-[#6f7e75] mt-1">
            {reviewsResult.completedUnits} من أصل {reviewsResult.dueUnits} استحقاق وحدة
          </div>
        </div>

        {/* Metric 2: On-Time execution rate */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e3d5] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#526359] mb-1">
            <span>المنفذة في موعدها المحدد</span>
            <span className="text-[10px] text-[#7d8c82]">في نفس تاريخ الاستحقاق</span>
          </div>
          <div className="text-xl font-bold text-emerald-800">
            {reviewsResult.onTimePercent !== null
              ? `${reviewsResult.onTimePercent}%`
              : 'لا استحقاقات'}
          </div>
          <div className="text-[11px] text-[#6f7e75] mt-1">
            {reviewsResult.onTimeUnits} وحدة في موعدها (السداد المتأخر لا يحسب كموعد)
          </div>
        </div>

        {/* Overdue alert count */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e3d5] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#526359] mb-1">
            <span>المتأخرات المتراكمة</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className={`text-xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : 'text-[#12372a]'}`}>
            {overdueTasks.length} <span className="text-xs font-normal">أوجه</span>
          </div>
          <div className="text-[11px] text-[#6f7e75] mt-1">
            {overdueTasks.length > 0 ? 'يجب سدادها قبل الجديد' : 'لا توجد متأخرات ولله الحمد'}
          </div>
        </div>

        {/* Weak pages count */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e3d5] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#526359] mb-1">
            <span>يحتاج تثبيتًا (ضعيف)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className={`text-xl font-bold ${weakPages.length > 0 ? 'text-red-600' : 'text-[#12372a]'}`}>
            {weakPages.length} <span className="text-xs font-normal">أوجه</span>
          </div>
          <div className="text-[11px] text-[#6f7e75] mt-1">
            أوجه تعثرت في آخر تسميع لها
          </div>
        </div>
      </div>

      {/* Intervention Advice Banner if >= 2 weak pages */}
      {showInterventionAdvice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold font-cairo text-sm">
              تنبيه منهجي: يُوصى بإيقاف الجديد مؤقتاً (٢٤–٤٨ ساعة)
            </h3>
            <p className="leading-relaxed">
              لديك {weakPages.length} أوجه بحاجة لتثبيت. القاعدة المنهجية توصي بتخصيص ١٥–٢٠ دقيقة لكل وجه ضعيف، وإيقاف ورد الجديد لمدة ٢٤–٤٨ ساعة حتى تستقر هذه المقاطع في جلستين ناجحتين يفصل بينهما يوم.
            </p>
          </div>
        </div>
      )}

      {/* Spaced Reviews Section */}
      <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0ebd9]">
          <div>
            <h2 className="text-base font-bold text-[#12372a] font-cairo">
              جدول المراجعة المتباعدة (+1، +3، +7، +14، +30)
            </h2>
            <p className="text-xs text-[#6f7e75] mt-0.5">
              كل وجه يحفظ فعلياً يولد استحقاقاته الخمسة بدقة؛ الصفحة الواحدة في اليوم الواحد تسمّع مرة واحدة وتفي بجميع أسبابها.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#fbf9f4] p-1 rounded-xl border border-[#e8e3d5]">
            <button
              onClick={() => setSubTab('due')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'due' ? 'bg-[#12372a] text-white shadow-xs' : 'text-[#526359] hover:bg-[#ede7d7]'
              }`}
            >
              مستحق اليوم ({dueTodayTasks.length})
            </button>
            <button
              onClick={() => setSubTab('overdue')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'overdue' ? 'bg-[#12372a] text-white shadow-xs' : 'text-[#526359] hover:bg-[#ede7d7]'
              }`}
            >
              المتأخرات ({overdueTasks.length})
            </button>
            <button
              onClick={() => setSubTab('upcoming')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'upcoming' ? 'bg-[#12372a] text-white shadow-xs' : 'text-[#526359] hover:bg-[#ede7d7]'
              }`}
            >
              القادمة (٧ أيام)
            </button>
            <button
              onClick={() => setSubTab('weak')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'weak' ? 'bg-[#12372a] text-white shadow-xs' : 'text-[#526359] hover:bg-[#ede7d7]'
              }`}
            >
              مواضع الضعف ({weakPages.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Due Today */}
        {subTab === 'due' && (
          <div className="space-y-2.5">
            {dueTodayTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dueTodayTasks.map(t => {
                  const summary = getPageContentSummary(t.page, seed);
                  return (
                    <div
                      key={t.page}
                      className="p-3.5 rounded-xl border border-[#e8e3d5] bg-[#fbf9f4] hover:bg-white transition-colors flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#12372a]">وجه {t.page}</span>
                          <span className="text-[10px] text-[#9a781b] bg-[#c59b27]/15 px-2 py-0.5 rounded font-semibold">
                            {t.reasons.join(' · ')}
                          </span>
                        </div>
                        <p className="text-xs text-[#526359] font-amiri line-clamp-1">{summary}</p>
                      </div>

                      <button
                        onClick={() => onOpenRecitation(t.page, 'review')}
                        className="px-3.5 py-1.5 bg-[#12372a] hover:bg-[#1b4d36] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                      >
                        تسميع
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-[#fbf9f4] rounded-xl border border-dashed border-[#d8d2c4]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-90" />
                <h4 className="text-sm font-bold text-[#12372a]">لا توجد مراجعات متباعدة مستحقة اليوم</h4>
                <p className="text-xs text-[#6f7e75] mt-1">
                  أنت على المسار الصحيح ولم تتراكم أي مهام لليوم.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Overdue */}
        {subTab === 'overdue' && (
          <div className="space-y-2.5">
            {overdueTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overdueTasks.map(t => {
                  const summary = getPageContentSummary(t.page, seed);
                  return (
                    <div
                      key={t.page}
                      className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-red-950">وجه {t.page}</span>
                          <span className="text-[10px] text-red-800 bg-red-100 px-2 py-0.5 rounded font-bold">
                            تأخر {t.ageDays} يوم · استحق في {t.earliestDueDate}
                          </span>
                        </div>
                        <p className="text-xs text-[#526359] font-amiri line-clamp-1">{summary}</p>
                      </div>

                      <button
                        onClick={() => onOpenRecitation(t.page, 'review')}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                      >
                        تسميع وسداد
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-[#fbf9f4] rounded-xl border border-dashed border-[#d8d2c4]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-90" />
                <h4 className="text-sm font-bold text-[#12372a]">لا توجد أي مراجعات متأخرة!</h4>
                <p className="text-xs text-[#6f7e75] mt-1">
                  ما شاء الله، جميع التسميعات المتباعدة منتظمة وفي مواعيدها.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Upcoming 7 Days */}
        {subTab === 'upcoming' && (
          <div className="space-y-3">
            {Array.from(upcomingMap.entries()).map(([dateStr, pages]) => (
              <div
                key={dateStr}
                className="p-3.5 rounded-xl border border-[#e8e3d5] bg-[#fbf9f4] flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-[#12372a]">{dateStr}</div>
                  <div className="text-[11px] text-[#6f7e75]">{pages.length} أوجه مستحقة</div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {pages.map(p => (
                    <span
                      key={p}
                      className="px-2 py-0.5 bg-white border border-[#d8d2c4] rounded text-xs text-[#12372a] font-medium"
                    >
                      ص {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {upcomingMap.size === 0 && (
              <div className="text-center py-8 bg-[#fbf9f4] rounded-xl border border-dashed border-[#d8d2c4]">
                <Clock className="w-8 h-8 text-[#c59b27] mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-[#12372a]">لا توجد استحقاقات قادمة مسجلة</h4>
                <p className="text-xs text-[#6f7e75] mt-1">
                  ستتولد الاستحقاقات تلقائياً مع تسجيل المزيد من الأوجه الجديدة.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Weak Pages */}
        {subTab === 'weak' && (
          <div className="space-y-2.5">
            {weakPages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weakPages.map(page => {
                  const summary = getPageContentSummary(page, seed);
                  return (
                    <div
                      key={page}
                      className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#12372a]">وجه {page}</span>
                          <span className="text-[10px] text-red-800 bg-red-100 px-2 py-0.5 rounded font-bold">
                            يحتاج تثبيتًا
                          </span>
                        </div>
                        <p className="text-xs text-[#526359] font-amiri line-clamp-1">{summary}</p>
                      </div>

                      <button
                        onClick={() => onOpenRecitation(page, 'review')}
                        className="px-3.5 py-1.5 bg-[#12372a] hover:bg-[#1b4d36] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                      >
                        إعادة تسميع
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-[#fbf9f4] rounded-xl border border-dashed border-[#d8d2c4]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-90" />
                <h4 className="text-sm font-bold text-[#12372a]">لا توجد أوجه ضعيفة حاليًا</h4>
                <p className="text-xs text-[#6f7e75] mt-1">
                  كل الأوجه المعتمدة نجحت في آخر تسميع لها بحمد الله.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Old Cycle In-depth Tracker */}
      <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0ebd9]">
          <div>
            <h2 className="text-base font-bold text-[#12372a] flex items-center gap-2 font-cairo">
              <RotateCcw className="w-5 h-5 text-[#c59b27]" />
              دورة المحفوظ القديم (١٥ وجهاً يومياً)
            </h2>
            <p className="text-xs text-[#526359] mt-0.5">
              تبدأ من ص ١ إلى ص ٣٤١ وتتوسع تدريجياً لضم الأوجه الجديدة التي أتمت مراجعة اليوم ٣٠ بنجاح.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="bg-[#fbf9f4] px-3 py-1.5 rounded-lg border border-[#e8e3d5] font-semibold text-[#12372a]">
              الدورة رقم {oldCycle.cycleIteration}
            </span>
            <span className="text-[#6f7e75]">
              طول الدورة المقدر: نحو {cycleDaysEst} يومًا
            </span>
          </div>
        </div>

        {/* Progress Bar of Current Cycle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#12372a]">
              المؤشر الحالي: ص {oldCycle.currentPointerPage} من أصل {totalEligible} صفحة مؤهلة
            </span>
            <span className="text-[#6f7e75]">
              {Math.round(((oldCycle.currentPointerPage - 1) / totalEligible) * 100)}% من الدورة
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#f0ebd9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1b4d36] transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round(((oldCycle.currentPointerPage - 1) / totalEligible) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Today's 15 pages in old cycle */}
        <div className="bg-[#fbf9f4] p-4 rounded-xl border border-[#e8e3d5] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#12372a]">
              ورد اليوم من القديم (١٥ صفحة): ص {oldCycleBatch[0] ?? 1} إلى ص {oldCycleBatch[oldCycleBatch.length - 1] ?? 15}
            </h3>
            <span className="text-xs text-emerald-800 font-semibold">
              {oldCycleDoneToday.length} / 15 صفحة مسجلة
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-15 gap-2">
            {oldCycleBatch.map(p => {
              const isDone = oldCycleDoneToday.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => onOpenRecitation(p, 'old')}
                  className={`py-2 px-1 text-xs rounded-lg border font-semibold flex flex-col items-center justify-center transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-[#12372a] border-[#d8d2c4] hover:bg-[#ede7d7]'
                  }`}
                  title={`وجه ${p} - انقر لتسجيل التسميع أو التعديل`}
                >
                  <span>{p}</span>
                  {isDone && <Check className="w-3 h-3 text-white mt-0.5" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-[#e8e3d5]">
            <p className="text-[#6f7e75] text-[11px] max-w-lg leading-relaxed">
              عند إكمال جزء من الورد يبقى غير المنجز في أول الدور دون إعادة ما تم بنجاح. لا تتراكم أوجه إضافية عن أيام الغياب.
            </p>
            <button
              onClick={() => onAdvanceOldCycle(oldCycleBatch)}
              disabled={oldCycleDoneToday.length === 15}
              className="px-4 py-2 bg-[#12372a] hover:bg-[#1b4d36] disabled:bg-[#d8d2c4] text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-[#c59b27]" />
              تسجيل ورد القديم كاملاً (١٥ صفحة)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
