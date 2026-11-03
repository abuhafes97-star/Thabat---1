/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Flame,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { QuranPlanSeed, RecitationEvent } from '../types/quranPlan';
import {
  todayInRiyadh,
  addDays,
  computeProgress,
  getPageContentSummary,
  passed,
  daysBetween,
} from '../lib/hifzCore';

interface ProgressTabProps {
  currentDate: string;
  seed: QuranPlanSeed;
  events: RecitationEvent[];
  onSelectPage: (page: number) => void;
  dailyAvailableMinutes: number;
}

export const ProgressTab: React.FC<ProgressTabProps> = ({
  currentDate,
  seed,
  events,
  onSelectPage,
  dailyAvailableMinutes,
}) => {
  const yesterday = addDays(currentDate, -1);

  // Today's live progress
  const currentProg = useMemo(
    () => computeProgress(seed, events, currentDate),
    [seed, events, currentDate]
  );

  // End of yesterday comparison baseline
  const yesterdayProg = useMemo(
    () => computeProgress(seed, events, yesterday),
    [seed, events, yesterday]
  );

  // Overall Plan Status determination
  const planStatus = useMemo(() => {
    if (currentDate < seed.profile.startDate) {
      return {
        key: 'not_started',
        title: 'لم تبدأ الخطة بعد',
        desc: `تاريخ البداية المقرر هو ${seed.profile.startDate} م (٤ نوفمبر ٢٠٢٦). الاستعداد والتهيئة هما الأولوية الآن.`,
        bg: 'bg-slate-50 text-slate-800 border-slate-200',
      };
    }

    if (currentProg.approvedCount === 0 && currentProg.learnedCount === 0) {
      return {
        key: 'no_progress',
        title: 'لم تُسجّل أي جلسة بعد',
        desc: 'ابدأ بتسميع ورد اليوم الأول لاعتماد أول إنجاز على بركة الله.',
        bg: 'bg-amber-50 text-amber-900 border-amber-200',
      };
    }

    if (currentProg.weakPages.length > 0) {
      return {
        key: 'needs_consolidation',
        title: 'يحتاج تثبيتًا',
        desc: `يوجد ${currentProg.weakPages.length} أوجه بحاجة لضبط وإعادة تسميع قبل الاسترسال في الجديد.`,
        bg: 'bg-red-50 text-red-900 border-red-200',
      };
    }

    if (currentProg.overduePages.length > 0) {
      return {
        key: 'needs_catchup',
        title: 'يحتاج تعويضًا',
        desc: `توجد ${currentProg.overduePages.length} أوجه متأخرة عن موعد اعتمادها المخطط، أقدمها مستحق منذ ${currentProg.oldestUnmetDate}.`,
        bg: 'bg-amber-50 text-amber-900 border-amber-200',
      };
    }

    if (currentProg.netPages > 0) {
      return {
        key: 'ahead',
        title: 'متقدم على الخطة',
        desc: `ما شاء الله، إنجازك المعتمد يسبق المخطط بصافي ${currentProg.netPages} أوجه إضافية دون فجوات.`,
        bg: 'bg-emerald-50 text-emerald-950 border-emerald-300',
      };
    }

    return {
      key: 'on_track',
      title: 'على المسار بدقة',
      desc: 'إنجازك المعتمد يطابق الخطة المرجعية دون فجوات فائتة أو مواضع ضعف مؤثرة.',
      bg: 'bg-emerald-50 text-emerald-950 border-emerald-300',
    };
  }, [currentDate, seed, currentProg]);

  // Projected Completion Date calculation (requires >= 7 days elapsed and >=3 planned new days)
  const projection = useMemo(() => {
    const elapsedDays = daysBetween(seed.profile.startDate, currentDate);
    if (elapsedDays < 7) {
      return {
        ready: false,
        reason: 'يتطلب التوقع انقضاء ٧ أيام تقويمية على الأقل لحساب معدل واقعي.',
      };
    }

    // Rolling 14-day window
    const windowStart = addDays(currentDate, -13);
    const plannedNewDaysInWindow = seed.plan.days.filter(
      d => d.date >= windowStart && d.date <= currentDate && d.type === 'new'
    ).length;

    if (plannedNewDaysInWindow < 3) {
      return {
        ready: false,
        reason: 'يتطلب التوقع ٣ أيام حفظ جديد مخططة على الأقل في نافذة القياس.',
      };
    }

    // Actual learned pages in this window
    const learnedInWindow = events.filter(
      e => e.date >= windowStart && e.date <= currentDate && e.type === 'new' && passed(e)
    );
    const uniqueLearnedInWindow = new Set(learnedInWindow.map(e => e.page)).size;

    const dailyRate = uniqueLearnedInWindow / plannedNewDaysInWindow;
    if (dailyRate <= 0.1) {
      return {
        ready: false,
        reason: 'المعدل الحالي قريب من الصفر، لا يمكن بناء توقع موثوق قبل تسجيل جلسات منتظمة.',
      };
    }

    const remainingPages = 263 - currentProg.learnedCount;
    const daysNeeded = Math.ceil(remainingPages / Math.min(4, dailyRate));
    const projectedDate = addDays(currentDate, daysNeeded);

    return {
      ready: true,
      dailyRate: Math.round(dailyRate * 100) / 100,
      remainingPages,
      projectedDate,
      daysNeeded,
      isExceedingCap: dailyRate > 4.0,
    };
  }, [seed, events, currentDate, currentProg.learnedCount]);

  return (
    <div className="space-y-6">
      {/* Overall Plan Status Banner */}
      <div className={`p-4 rounded-2xl border ${planStatus.bg} shadow-xs flex items-start justify-between gap-4`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white/70 shadow-xs mt-0.5">
            <Award className="w-5 h-5 text-[#12372a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6f7e75]">حالة الخطة العامة:</span>
              <h3 className="text-base font-bold font-cairo text-[#12372a]">{planStatus.title}</h3>
            </div>
            <p className="text-xs mt-1 leading-relaxed max-w-2xl">{planStatus.desc}</p>
          </div>
        </div>

        <div className="text-left hidden sm:block">
          <span className="text-xs text-[#6f7e75] block">الهدف الإجمالي</span>
          <span className="text-sm font-bold text-[#12372a]">٢٦٣ وجهاً (المؤمنون–الناس)</span>
        </div>
      </div>

      {/* Core Math Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Approved Pages */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e3d5] shadow-xs">
          <div className="text-xs text-[#6f7e75] mb-1 flex items-center justify-between">
            <span>إنجاز الحفظ المعتمد</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#12372a]">
            {currentProg.approvedPercent !== null ? `${currentProg.approvedPercent}%` : '0%'}
          </div>
          <div className="text-xs text-[#526359] mt-1">
            <span className="font-bold text-[#12372a]">{currentProg.approvedCount}</span> من أصل ٢٦٣ وجهاً
          </div>
          <p className="text-[10px] text-[#7d8c82] mt-1.5 pt-1.5 border-t border-[#f0ebd9]">
            شرط الاعتماد: نجاح الجديد + نجاح مراجعة يوم لاحق.
          </p>
        </div>

        {/* Metric 2: Pending Approval */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e3d5] shadow-xs">
          <div className="text-xs text-[#6f7e75] mb-1 flex items-center justify-between">
            <span>قيد التثبيت</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800">
            {currentProg.pendingPages.length} <span className="text-xs font-normal">أوجه</span>
          </div>
          <div className="text-xs text-[#526359] mt-1">
            سُمّعت جديداً بانتظار مراجعة اليوم اللاحق
          </div>
          <p className="text-[10px] text-[#7d8c82] mt-1.5 pt-1.5 border-t border-[#f0ebd9]">
            {currentProg.learnedCount} وجه حفظ أولي ({currentProg.learnedPercent}%)
          </p>
        </div>

        {/* Metric 3: Stable Approved */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e3d5] shadow-xs">
          <div className="text-xs text-[#6f7e75] mb-1 flex items-center justify-between">
            <span>الثابت حالياً</span>
            <Sparkles className="w-4 h-4 text-[#c59b27]" />
          </div>
          <div className="text-2xl font-bold text-[#12372a]">
            {currentProg.stableCount} <span className="text-xs font-normal">أوجه</span>
          </div>
          <div className="text-xs text-[#526359] mt-1">
            ثبات المعتمد:{' '}
            <span className="font-semibold text-emerald-800">
              {currentProg.stabilityAmongApprovedPercent !== null
                ? `${currentProg.stabilityAmongApprovedPercent}%`
                : 'لا بيانات بعد'}
            </span>
          </div>
          <p className="text-[10px] text-[#7d8c82] mt-1.5 pt-1.5 border-t border-[#f0ebd9]">
            نسبة الصفحات المعتمدة التي نجحت في آخر تسميع
          </p>
        </div>

        {/* Metric 4: Weak Pages */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e3d5] shadow-xs">
          <div className="text-xs text-[#6f7e75] mb-1 flex items-center justify-between">
            <span>يحتاج تثبيتًا</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-2xl font-bold ${currentProg.weakPages.length > 0 ? 'text-red-600' : 'text-[#12372a]'}`}>
            {currentProg.weakPages.length} <span className="text-xs font-normal">أوجه</span>
          </div>
          <div className="text-xs text-[#526359] mt-1">
            أوجه معتمدة تعثرت في آخر تسميع لها
          </div>
          <p className="text-[10px] text-[#7d8c82] mt-1.5 pt-1.5 border-t border-[#f0ebd9]">
            لا يلغي إنجاز الاكتساب، لكن يخفض الثبات
          </p>
        </div>
      </div>

      {/* Comparison with Yesterday + Contiguous Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card: Comparison at End of Yesterday */}
        <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0ebd9]">
            <h3 className="text-sm font-bold text-[#12372a] font-cairo">
              المقارنة بنهاية الأمس ({yesterday})
            </h3>
            <span className="text-[11px] text-[#6f7e75]">مقارنة منضبطة دون حساب اليوم الجاري كتأخر</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
              <span className="text-[10px] text-[#6f7e75] block">المعتمد الفعلي</span>
              <span className="text-base font-bold text-[#12372a]">{yesterdayProg.approvedCount}</span>
            </div>

            <div className="p-2.5 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
              <span className="text-[10px] text-[#6f7e75] block">المتوقع بالمخطط</span>
              <span className="text-base font-bold text-[#12372a]">{yesterdayProg.expectedApprovedCount}</span>
            </div>

            <div className="p-2.5 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
              <span className="text-[10px] text-[#6f7e75] block">صافي الفارق</span>
              <span
                className={`text-base font-bold ${
                  yesterdayProg.netPages >= 0 ? 'text-emerald-800' : 'text-red-600'
                }`}
              >
                {yesterdayProg.netPages > 0 ? `+${yesterdayProg.netPages}` : yesterdayProg.netPages}
              </span>
            </div>
          </div>

          {yesterdayProg.overduePages.length > 0 && (
            <div className="text-xs text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <span className="font-bold block mb-0.5">الصفحات المتأخرة ({yesterdayProg.overduePages.length} أوجه):</span>
              <span className="text-[11px] font-mono leading-relaxed">
                ص {yesterdayProg.overduePages.join('، ص ')}
              </span>
            </div>
          )}

          {yesterdayProg.aheadPages.length > 0 && (
            <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <span className="font-bold block mb-0.5">الصفحات المتقدمة ({yesterdayProg.aheadPages.length} أوجه):</span>
              <span className="text-[11px] font-mono leading-relaxed">
                ص {yesterdayProg.aheadPages.join('، ص ')}
              </span>
            </div>
          )}
        </div>

        {/* Card: Contiguous Streak & Next Page */}
        <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0ebd9]">
            <h3 className="text-sm font-bold text-[#12372a] font-cairo">
              سلسلة الحفظ المتصل والموضع القادم
            </h3>
            <span className="text-[11px] text-[#6f7e75]">من ص ٣٤٢ حتى أول فجوة</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#e8f2ec] border border-[#c1ded0] flex flex-col items-center justify-center text-[#12372a] flex-shrink-0">
              <span className="text-xl font-black">{currentProg.contiguousApprovedCount}</span>
              <span className="text-[9px] text-[#526359]">وجه متصل</span>
            </div>

            <div className="text-xs space-y-1">
              <div className="font-semibold text-[#12372a]">
                {currentProg.contiguousApprovedCount > 0
                  ? `حفظ متصل من ص ٣٤٢ إلى ص ${341 + currentProg.contiguousApprovedCount}`
                  : 'لم يكتمل اعتماد وجه البداية (ص ٣٤٢) بعد'}
              </div>
              <p className="text-[11px] text-[#6f7e75]">
                {currentProg.contiguousApprovedCount === currentProg.approvedCount
                  ? 'سلسلة متصلة كاملة دون أي فجوات مفقودة في المحفوظ المعتمد.'
                  : `يوجد فارق بين المتصل (${currentProg.contiguousApprovedCount}) وإجمالي المعتمد (${currentProg.approvedCount}) لوجود صفحات متقدمة قبل استيفاء سابقتها.`}
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5] text-xs flex items-center justify-between">
            <span className="text-[#526359]">الوجه الجديد القادم للحفظ:</span>
            <span className="font-bold text-[#12372a] bg-white px-2 py-0.5 rounded border border-[#d8d2c4]">
              {currentProg.nextUnlearnedPage ? `ص ${currentProg.nextUnlearnedPage}` : 'تم إتمام حفظ كل الأوجه!'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Mushaf 342-604 Heatmap / Grid */}
      <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0ebd9]">
          <div>
            <h3 className="text-base font-bold text-[#12372a] font-cairo">
              خريطة مصحف الهدف (ص ٣٤٢ إلى ٦٠٤ — ٢٦٣ وجهًا)
            </h3>
            <p className="text-xs text-[#526359] mt-0.5">
              انقر على أي صفحة لعرض تفاصيلها وسجل تسميعها ومستحقاتها المتباعدة
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600" />
              <span className="text-[#526359]">معتمد وثابت</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-[#526359]">قيد التثبيت</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span className="text-[#526359]">يحتاج تثبيتًا</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#f0ebd9] border border-[#d8d2c4]" />
              <span className="text-[#526359]">لم يُحفظ بعد</span>
            </div>
          </div>
        </div>

        {/* The Grid of 263 pages */}
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-1.5">
          {seed.profile.targetPages.map(page => {
            const pageEvents = events.filter(e => e.page === page && !e.voided);
            const firstNewPass = pageEvents.find(e => e.type === 'new' && passed(e));
            const followUp = firstNewPass && pageEvents.find(e => e.type !== 'new' && e.date > firstNewPass.date && passed(e));
            const lastAttempt = pageEvents[pageEvents.length - 1];

            let cellBg = 'bg-[#fbf9f4] text-[#526359] border-[#e4decb] hover:bg-[#ede7d7]';

            if (firstNewPass) {
              if (followUp) {
                if (lastAttempt && passed(lastAttempt)) {
                  cellBg = 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs';
                } else {
                  cellBg = 'bg-red-600 text-white border-red-700 font-bold shadow-xs';
                }
              } else {
                cellBg = 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs';
              }
            } else if (lastAttempt && !passed(lastAttempt)) {
              cellBg = 'bg-red-200 text-red-950 border-red-300 font-medium';
            }

            return (
              <button
                key={page}
                onClick={() => onSelectPage(page)}
                className={`h-9 text-xs rounded-lg border flex items-center justify-center transition-all ${cellBg}`}
                title={`وجه ${page}: ${getPageContentSummary(page, seed)}`}
              >
                {page}
              </button>
            );
          })}
        </div>
      </div>

      {/* Projected Completion Section */}
      <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#12372a] font-cairo flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#c59b27]" />
          توقع تاريخ إتمام الحفظ (بناءً على قياس الأداء الفعلي)
        </h3>

        {projection.ready ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
                <span className="text-[#6f7e75] block">معدل الحفظ الفعلي (نافذة ١٤ يوماً)</span>
                <span className="text-base font-bold text-[#12372a]">
                  {projection.dailyRate} <span className="text-xs font-normal">وجه/يوم حفظ</span>
                </span>
              </div>

              <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
                <span className="text-[#6f7e75] block">الأوجه المتبقية للحفظ الجديد</span>
                <span className="text-base font-bold text-[#12372a]">
                  {projection.remainingPages} <span className="text-xs font-normal">وجه</span>
                </span>
              </div>

              <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
                <span className="text-[#6f7e75] block">تاريخ الإتمام التقديري</span>
                <span className="text-base font-bold text-emerald-800">
                  {projection.projectedDate}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#6f7e75] leading-relaxed">
              هذا التقدير حسابي حتمي مبني على نافذة آخر ١٤ يومًا مع احتساب الأيام التي فاتت دون إنجاز في المقام، ويفترض استمرار معدل إتقانك الحالي.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5] text-xs text-[#526359] leading-relaxed">
            <span className="font-bold text-[#12372a] block mb-1">
              التقدير الحسابي يتطلب بيانات كافية:
            </span>
            {projection.reason}
          </div>
        )}
      </div>
    </div>
  );
};
