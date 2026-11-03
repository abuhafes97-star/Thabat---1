/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, SlidersHorizontal, AlertTriangle, CheckCircle2, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { QuranPlanSeed, RecitationEvent, PlanRoot, PlanDay } from '../types/quranPlan';
import { todayInRiyadh, addDays, passed, history, daysBetween } from '../lib/hifzCore';

interface RedistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  seed: QuranPlanSeed;
  events: RecitationEvent[];
  dailyAvailableMinutes: number;
  onApply: (plan: PlanRoot) => void;
}

export const RedistributeModal: React.FC<RedistributeModalProps> = ({
  isOpen,
  onClose,
  seed,
  events,
  dailyAvailableMinutes,
  onApply,
}) => {
  const [includeFlexDays, setIncludeFlexDays] = useState(true);
  const [shortenConsolidationDays, setShortenConsolidationDays] = useState(0); // 0 to 5 days
  const [extendCompletionDays, setExtendCompletionDays] = useState(0);

  const asOfDate = todayInRiyadh();
  const h = useMemo(() => history(seed, events, asOfDate), [seed, events, asOfDate]);

  // Remaining target pages not yet learned
  const unlearnedPages = useMemo(() => {
    return seed.profile.targetPages.filter(p => !h.learned.has(p));
  }, [seed, h.learned]);

  // Available new days calculation
  const simulation = useMemo(() => {
    const remainingCount = unlearnedPages.length;
    // Base end date for new pages is 2027-01-28 + extendCompletionDays + shortenConsolidationDays
    const baseCutoff = '2027-01-28';
    const effectiveCutoff = addDays(baseCutoff, extendCompletionDays + shortenConsolidationDays);

    // Start from either plan start (2026-11-04) or today, whichever is later
    const startFrom = asOfDate < seed.profile.startDate ? seed.profile.startDate : asOfDate;

    // Filter available days between startFrom and effectiveCutoff
    const candidateDays: PlanDay[] = [];
    let cur = startFrom;
    while (cur <= effectiveCutoff) {
      const origDay = seed.plan.days.find(d => d.date === cur);
      const isTuesday = origDay?.weekdayAr === 'الثلاثاء' || new Date(cur + 'T00:00:00Z').getUTCDay() === 2;
      const isFlex = seed.plan.flexDates.includes(cur);

      // Tuesdays are review only (never new).
      if (!isTuesday) {
        if (!isFlex || includeFlexDays) {
          candidateDays.push(
            origDay || {
              date: cur,
              weekdayAr: 'يوم',
              week: 1,
              type: 'new',
              newPages: [],
              plannedNearPagesForReference: [],
              oldCyclePagesTarget: 15,
              consolidationPages: [],
              estimatedMinutes: 120,
            }
          );
        }
      }
      cur = addDays(cur, 1);
    }

    const availableDaysCount = candidateDays.length;
    const requiredRate = availableDaysCount > 0 ? remainingCount / availableDaysCount : 99;
    const isExceedingCap = requiredRate > 4.0;

    // Distribute pages (max 4 per day)
    let pageIdx = 0;
    const simulatedDays: PlanDay[] = candidateDays.map((d, dayIndex) => {
      // Pick either 4 or 3 pages to distribute smoothly
      const pagesForDay: number[] = [];
      const remainingPagesToDistribute = remainingCount - pageIdx;
      const daysRemaining = candidateDays.length - dayIndex;
      const quota = Math.min(4, Math.ceil(remainingPagesToDistribute / daysRemaining));

      for (let i = 0; i < quota && pageIdx < remainingCount; i++) {
        pagesForDay.push(unlearnedPages[pageIdx++]);
      }

      return {
        ...d,
        type: 'new',
        newPages: pagesForDay,
        estimatedMinutes: pagesForDay.length * 20 + 30 + 10,
      };
    });

    return {
      remainingCount,
      availableDaysCount,
      requiredRate: Math.round(requiredRate * 100) / 100,
      isExceedingCap,
      simulatedDays,
      effectiveCutoff,
    };
  }, [
    unlearnedPages,
    asOfDate,
    seed,
    includeFlexDays,
    shortenConsolidationDays,
    extendCompletionDays,
  ]);

  if (!isOpen) return null;

  const handleApply = () => {
    // Generate modified plan
    const modifiedDays: PlanDay[] = seed.plan.days.map(d => {
      const sim = simulation.simulatedDays.find(sd => sd.date === d.date);
      if (sim) return sim;
      return d;
    });

    const newPlan: PlanRoot = {
      ...seed.plan,
      id: `custom-redistribute-${Date.now()}`,
      immutableBaseline: false,
      days: modifiedDays,
    };

    onApply(newPlan);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="redistribute-modal-title"
    >
      <div className="bg-white text-[#1c2a22] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#e8e3d5] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#12372a] text-[#fbf9f4] px-6 py-4 flex items-center justify-between border-b border-[#1b4d36]">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-[#c59b27]" />
            <div>
              <h2 id="redistribute-modal-title" className="text-lg font-bold font-cairo">
                أداة إعادة توزيع الصفحات المتبقية
              </h2>
              <p className="text-xs text-[#dfc882]">
                إعادة جدولة دقيقة دون المساس بالخطة الأصلية المرجعية أو محو السجلات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="text-[#ede7d7] hover:text-white p-1 rounded-lg hover:bg-[#184a37] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Status summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
              <span className="text-[11px] text-[#6f7e75] block">الصفحات المتبقية</span>
              <span className="text-lg font-bold text-[#12372a]">
                {simulation.remainingCount} <span className="text-xs font-normal">وجه</span>
              </span>
            </div>

            <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
              <span className="text-[11px] text-[#6f7e75] block">الأيام المتاحة للحفظ</span>
              <span className="text-lg font-bold text-[#12372a]">
                {simulation.availableDaysCount} <span className="text-xs font-normal">يوم</span>
              </span>
            </div>

            <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
              <span className="text-[11px] text-[#6f7e75] block">المعدل اليومي المطلوب</span>
              <span
                className={`text-lg font-bold ${
                  simulation.isExceedingCap ? 'text-red-600' : 'text-[#12372a]'
                }`}
              >
                {simulation.requiredRate} <span className="text-xs font-normal">وجه/يوم</span>
              </span>
            </div>

            <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#e8e3d5]">
              <span className="text-[11px] text-[#6f7e75] block">سقف الخطة اليومي</span>
              <span className="text-lg font-bold text-[#c59b27]">٤ أوجه</span>
            </div>
          </div>

          {/* Exceeding Cap Warning */}
          {simulation.isExceedingCap && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-red-950 font-cairo">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                المعدل المطلوب ({simulation.requiredRate} أوجه/يوم) يتجاوز سقف الـ ٤ أوجه!
              </div>
              <p className="text-xs leading-relaxed text-red-800">
                لا نوصي برفع الورد فوق ٤ أوجه لتجنب انهيار جودة التسميع. يرجى اختيار أحد البدائل الواقعية التالية لمعادلة الخطة:
              </p>
            </div>
          )}

          {/* Options & Sliders */}
          <div className="bg-[#fbf9f4] p-4 rounded-xl border border-[#e8e3d5] space-y-4">
            <h3 className="text-xs font-bold text-[#12372a]">خيارات التعويض والمرونة</h3>

            {/* Toggle Flex Days */}
            <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-[#f0ebd9] transition-colors">
              <div>
                <span className="text-xs font-semibold text-[#12372a] block">
                  استغلال الأيام المرنة للتعويض
                </span>
                <span className="text-[11px] text-[#6f7e75]">
                  (أيام ١٨، ٢٥، ٢٧، ٢٨ يناير المخصصة للطوارئ)
                </span>
              </div>
              <input
                type="checkbox"
                checked={includeFlexDays}
                onChange={e => setIncludeFlexDays(e.target.checked)}
                className="w-4 h-4 rounded text-[#1b4d36] focus:ring-[#1b4d36] accent-[#1b4d36]"
              />
            </label>

            {/* Shorten consolidation slider */}
            <div className="p-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#12372a]">
                  تقليص أيام التثبيت الختامية لصالح الحفظ:
                </span>
                <span className="font-bold text-[#12372a] bg-white px-2 py-0.5 rounded border border-[#d8d2c4]">
                  {shortenConsolidationDays} أيام إضافية للحفظ
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={shortenConsolidationDays}
                onChange={e => setShortenConsolidationDays(parseInt(e.target.value))}
                className="w-full accent-[#1b4d36]"
              />
              <span className="text-[10px] text-[#6f7e75] block">
                يمكن تقصير جولة التثبيت إلى ٥–٧ أيام عند ثبات المحفوظ لإتاحة أيام تعويض إضافية.
              </span>
            </div>

            {/* Extend completion slider */}
            <div className="p-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#12372a]">
                  تمديد موعد إتمام الحفظ (أيام في بداية رمضان):
                </span>
                <span className="font-bold text-[#12372a] bg-white px-2 py-0.5 rounded border border-[#d8d2c4]">
                  +{extendCompletionDays} يوم
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                value={extendCompletionDays}
                onChange={e => setExtendCompletionDays(parseInt(e.target.value))}
                className="w-full accent-[#1b4d36]"
              />
              <span className="text-[10px] text-[#6f7e75] block">
                إذا تعذر الإتمام قبل رمضان بسقف ٤ أوجه، يتم تمديد الإتمام إلى الأيام الأولى من رمضان.
              </span>
            </div>
          </div>

          {/* Preview of distribution */}
          <div>
            <h4 className="text-xs font-bold text-[#12372a] mb-2 flex items-center justify-between">
              <span>معاينة الأيام القادمة بالتوزيع المقترح</span>
              <span className="text-[11px] font-normal text-[#6f7e75]">
                آخر يوم جديد: {simulation.effectiveCutoff}
              </span>
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-[#e8e3d5] rounded-xl p-2 bg-[#faf8f2]">
              {simulation.simulatedDays.slice(0, 15).map(d => (
                <div
                  key={d.date}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-[#eae4d5]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#12372a]">{d.date}</span>
                    <span className="text-[11px] text-[#6f7e75]">({d.weekdayAr})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#1b4d36]">
                      {d.newPages.length} أوجه:
                    </span>
                    <span className="text-[11px] text-[#526359]">
                      {d.newPages.join('، ')}
                    </span>
                  </div>
                </div>
              ))}
              {simulation.simulatedDays.length > 15 && (
                <div className="text-center text-[11px] text-[#6f7e75] py-1">
                  ... و {simulation.simulatedDays.length - 15} يومًا إضافيًا
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#fbf9f4] border-t border-[#e8e3d5] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#4b5a52] hover:bg-[#ede7d7] rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#12372a] hover:bg-[#1b4d36] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#c59b27]" />
            تطبيق التعديل على الخطة النشطة
          </button>
        </div>
      </div>
    </div>
  );
};
