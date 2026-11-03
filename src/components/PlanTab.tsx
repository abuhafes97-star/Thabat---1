/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { QuranPlanSeed, RecitationEvent, PlanRoot, PlanDay } from '../types/quranPlan';
import { getPageContentSummary, passed } from '../lib/hifzCore';
import { RedistributeModal } from './RedistributeModal';

interface PlanTabProps {
  seed: QuranPlanSeed;
  events: RecitationEvent[];
  customPlan: PlanRoot | null;
  onApplyCustomPlan: (plan: PlanRoot | null) => void;
  onSelectDate: (date: string) => void;
  onOpenRecitation: (page: number, type?: 'new' | 'review') => void;
  dailyAvailableMinutes: number;
}

export const PlanTab: React.FC<PlanTabProps> = ({
  seed,
  events,
  customPlan,
  onApplyCustomPlan,
  onSelectDate,
  onOpenRecitation,
  dailyAvailableMinutes,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(1);
  const [showRedistribute, setShowRedistribute] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const activePlan = customPlan || seed.plan;

  // Filter days by week or all
  const displayedDays = selectedWeek === 'all'
    ? activePlan.days
    : activePlan.days.filter(d => d.week === selectedWeek);

  const weeks = activePlan.weeks || seed.plan.weeks;

  return (
    <div className="space-y-6">
      {/* Plan Header & Action Bar */}
      <div className="bg-white rounded-2xl p-5 border border-[#e8e3d5] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#12372a] font-cairo">
              جدول خطة الحفظ والمراجعة
            </h2>
            {customPlan && (
              <span className="text-[11px] bg-[#dfc882]/30 text-[#856515] border border-[#c59b27]/40 px-2 py-0.5 rounded-md font-semibold">
                خطة معدلة نشطة
              </span>
            )}
          </div>
          <p className="text-xs text-[#526359] mt-0.5">
            البداية: ٤ نوفمبر ٢٠٢٦ م · آخر جديد: ٢٤ يناير ٢٠٢٧ م · رمضان المتوقع: ٨ فبراير ٢٠٢٧ م
          </p>
        </div>

        <div className="flex items-center gap-2">
          {customPlan && (
            <button
              onClick={() => onApplyCustomPlan(null)}
              className="px-3 py-1.5 text-xs text-[#526359] hover:bg-[#f4f0e6] border border-[#d8d2c4] rounded-lg transition-colors"
            >
              استعادة الخطة الأصلية
            </button>
          )}

          <button
            onClick={() => setShowRedistribute(true)}
            className="px-4 py-2 bg-[#12372a] hover:bg-[#1b4d36] text-[#fbf9f4] text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#c59b27]" />
            إعادة توزيع الخطة
          </button>
        </div>
      </div>

      {/* Week Selector Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedWeek('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
            selectedWeek === 'all'
              ? 'bg-[#12372a] text-[#fbf9f4] shadow-xs'
              : 'bg-white text-[#526359] hover:bg-[#f4f0e6] border border-[#e8e3d5]'
          }`}
        >
          كل الأسابيع (١–١٤)
        </button>

        {weeks.map(w => (
          <button
            key={w.week}
            onClick={() => setSelectedWeek(w.week)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              selectedWeek === w.week
                ? 'bg-[#12372a] text-[#fbf9f4] shadow-xs font-semibold'
                : 'bg-white text-[#526359] hover:bg-[#f4f0e6] border border-[#e8e3d5]'
            }`}
          >
            الأسبوع {w.week}
          </button>
        ))}

        <button
          onClick={() => setSelectedWeek(13)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
            selectedWeek === 13
              ? 'bg-[#12372a] text-[#fbf9f4] shadow-xs font-semibold'
              : 'bg-white text-[#526359] hover:bg-[#f4f0e6] border border-[#e8e3d5]'
          }`}
        >
          فترة التثبيت (٢٩ يناير - ٧ فبراير)
        </button>
      </div>

      {/* Week Summary Banner if a single week is chosen */}
      {selectedWeek !== 'all' && typeof selectedWeek === 'number' && (
        <div className="bg-[#fbf9f4] rounded-2xl p-4 border border-[#e8e3d5]">
          {selectedWeek <= 12 ? (
            (() => {
              const w = weeks.find(item => item.week === selectedWeek);
              if (!w) return null;
              return (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#12372a] text-sm font-cairo">
                      الأسبوع {w.week}: {w.startDate} إلى {w.endDate}
                    </span>
                    <span className="text-[#526359] block mt-0.5 font-amiri">
                      النطاق: سورة {w.from.surahName} ({w.from.fromAyah}) إلى سورة {w.to.surahName} ({w.to.toAyah})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-[#e8f2ec] text-[#12372a] font-bold px-2.5 py-1 rounded-lg border border-[#c1ded0]">
                      {w.newPages} وجهًا جديدًا
                    </span>
                    <span className="text-[#6f7e75]">
                      الصفحات: ص {w.fromPage} – ص {w.toPage}
                    </span>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-xs text-[#12372a]">
              <span className="font-bold font-cairo text-sm block mb-1">
                جولة التثبيت الختامية للمصحف الشريف (٢٩ يناير – ٧ فبراير ٢٠٢٧)
              </span>
              <p className="text-[#526359]">
                ١٠ أيام مخصصة لتسميع متصل لجميع الأوجه المحفوظة (٣٤٢–٦٠٤) بمعدل ٢٦–٢٧ وجهاً يومياً دون حفظ جديد.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Days Table / Grid */}
      <div className="bg-white rounded-2xl border border-[#e8e3d5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#fbf9f4] text-[#12372a] border-b border-[#e8e3d5] font-semibold">
              <tr>
                <th className="py-3 px-4">التاريخ واليوم</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">الحفظ الجديد</th>
                <th className="py-3 px-4">محتوى الآيات والسور</th>
                <th className="py-3 px-4">المراجعات والقديم</th>
                <th className="py-3 px-4 text-center">الوقت المقدر</th>
                <th className="py-3 px-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebd9]">
              {displayedDays.map(day => {
                const dayEvents = events.filter(e => e.date === day.date && !e.voided);
                const hasPassedNew = day.newPages.length > 0 && day.newPages.every(p => {
                  return events.some(e => e.page === p && e.type === 'new' && passed(e));
                });

                return (
                  <tr key={day.date} className="hover:bg-[#fbf9f4]/80 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-4 font-medium text-[#12372a] whitespace-nowrap">
                      <div className="font-bold">{day.date}</div>
                      <div className="text-[11px] text-[#6f7e75]">{day.weekdayAr}</div>
                    </td>

                    {/* Day Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                          day.type === 'new'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : day.type === 'review'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : day.type === 'flex'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {day.type === 'new' && 'جديد'}
                        {day.type === 'review' && 'مراجعة'}
                        {day.type === 'flex' && 'مرن'}
                        {day.type === 'consolidation' && 'تثبيت'}
                      </span>
                    </td>

                    {/* New Pages */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {day.newPages.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {day.newPages.map(p => {
                            const isLearned = events.some(e => e.page === p && e.type === 'new' && passed(e));
                            return (
                              <button
                                key={p}
                                onClick={() => onOpenRecitation(p, 'new')}
                                className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors ${
                                  isLearned
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-[#faf8f2] text-[#12372a] border-[#d8d2c4] hover:bg-[#ede7d7]'
                                }`}
                                title={`وجه ${p} - انقر لتسجيل التسميع`}
                              >
                                ص {p}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[#8c9c91] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Verse / Surah description */}
                    <td className="py-3.5 px-4 font-amiri text-xs text-[#37453d] max-w-xs">
                      {day.newPages.length > 0 ? (
                        day.newPages.map(p => getPageContentSummary(p, seed)).join('؛ ')
                      ) : day.consolidationPages.length > 0 ? (
                        `تثبيت الصفحات ${day.consolidationPages[0]}–${day.consolidationPages[day.consolidationPages.length - 1]}`
                      ) : day.type === 'review' ? (
                        'تسميع جديد الأسبوع كاملاً وبدايات مختارة'
                      ) : (
                        'مراجعة واستراحة من الجديد'
                      )}
                    </td>

                    {/* Review reference */}
                    <td className="py-3.5 px-4 text-[#526359] text-[11px]">
                      <div>القديم: {day.oldCyclePagesTarget} أوجه</div>
                      {day.plannedNearPagesForReference?.length > 0 && (
                        <div className="text-[10px] text-[#7d8c82]">
                          القريب التقديري: {day.plannedNearPagesForReference.length} أوجه
                        </div>
                      )}
                    </td>

                    {/* Time estimate */}
                    <td className="py-3.5 px-4 text-center font-semibold text-[#12372a] whitespace-nowrap">
                      {day.estimatedMinutes} د
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => onSelectDate(day.date)}
                        className="px-3 py-1 bg-[#f4f0e6] hover:bg-[#12372a] hover:text-white text-[#12372a] text-xs font-medium rounded-lg transition-colors"
                      >
                        عرض في اليوم
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Re-distribution Modal */}
      {showRedistribute && (
        <RedistributeModal
          isOpen={showRedistribute}
          onClose={() => setShowRedistribute(false)}
          seed={seed}
          events={events}
          dailyAvailableMinutes={dailyAvailableMinutes}
          onApply={onApplyCustomPlan}
        />
      )}
    </div>
  );
};
