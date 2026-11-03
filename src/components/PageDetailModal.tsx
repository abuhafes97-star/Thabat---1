/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, Calendar, Clock, CheckCircle2, AlertTriangle, ShieldAlert, Award } from 'lucide-react';
import { QuranPlanSeed, RecitationEvent, ErrorLogItem } from '../types/quranPlan';
import { getPageContentSummary, passed, addDays, REVIEW_OFFSETS } from '../lib/hifzCore';

interface PageDetailModalProps {
  page: number | null;
  onClose: () => void;
  seed: QuranPlanSeed;
  events: RecitationEvent[];
  errors: ErrorLogItem[];
  onOpenRecitation: (page: number, type?: 'new' | 'review') => void;
}

export const PageDetailModal: React.FC<PageDetailModalProps> = ({
  page,
  onClose,
  seed,
  events,
  errors,
  onOpenRecitation,
}) => {
  if (page === null) return null;

  const pageIndexItem = seed.pageIndex.find(p => p.page === page);
  const pageEvents = events
    .filter(e => e.page === page && !e.voided)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.recordedAt ?? '').localeCompare(b.recordedAt ?? ''));

  const pageErrors = errors.filter(e => e.page === page);

  const firstNewPass = pageEvents.find(e => e.type === 'new' && passed(e));
  const followUp = firstNewPass && pageEvents.find(e => e.type !== 'new' && e.date > firstNewPass.date && passed(e));
  const lastAttempt = pageEvents[pageEvents.length - 1];

  let statusText = 'لم يُحفظ بعد';
  let statusBadge = 'bg-[#f4f0e6] text-[#526359] border-[#d8d2c4]';

  if (firstNewPass) {
    if (followUp) {
      if (lastAttempt && passed(lastAttempt)) {
        statusText = 'معتمد وثابت';
        statusBadge = 'bg-emerald-100 text-emerald-950 border-emerald-300';
      } else {
        statusText = 'يحتاج تثبيتًا (تعثر في آخر تسميع)';
        statusBadge = 'bg-red-100 text-red-950 border-red-300';
      }
    } else {
      statusText = 'قيد التثبيت (بانتظار مراجعة اليوم اللاحق)';
      statusBadge = 'bg-amber-100 text-amber-950 border-amber-300';
    }
  } else if (lastAttempt && !passed(lastAttempt)) {
    statusText = 'لم ينجح التسميع الأولي';
    statusBadge = 'bg-red-100 text-red-950 border-red-300';
  }

  // Spaced repetition schedule based on first pass date
  const spacedSchedule = firstNewPass
    ? REVIEW_OFFSETS.map(offset => {
        const dueDate = addDays(firstNewPass.date, offset);
        const doneEvent = pageEvents.find(e => e.type !== 'new' && e.date >= dueDate && passed(e));
        return {
          offset,
          dueDate,
          done: !!doneEvent,
          doneDate: doneEvent?.date,
        };
      })
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="page-detail-title"
    >
      <div className="bg-white text-[#1c2a22] w-full max-w-xl rounded-2xl shadow-2xl border border-[#e8e3d5] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#12372a] text-[#fbf9f4] px-6 py-4 flex items-center justify-between border-b border-[#1b4d36]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#184a37] border border-[#c59b27]/40 flex items-center justify-center text-[#c59b27] font-bold text-base shadow-inner">
              {page}
            </div>
            <div>
              <h2 id="page-detail-title" className="text-lg font-bold font-cairo">
                تفاصيل الوجه {page}
              </h2>
              <p className="text-xs text-[#dfc882] font-amiri">
                {pageIndexItem ? getPageContentSummary(page, seed) : `صفحة ${page}`}
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status & Milestones */}
          <div className="bg-[#fbf9f4] p-4 rounded-xl border border-[#e8e3d5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#6f7e75]">حالة الوجه الحالية:</span>
              <span className={`px-2.5 py-1 rounded-lg border font-bold text-xs ${statusBadge}`}>
                {statusText}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#e8e3d5]">
              <div>
                <span className="text-[#6f7e75] block text-[11px]">تاريخ الحفظ الأولي:</span>
                <span className="font-semibold text-[#12372a]">
                  {firstNewPass ? firstNewPass.date : 'لم يُحفظ بعد'}
                </span>
              </div>
              <div>
                <span className="text-[#6f7e75] block text-[11px]">تاريخ الاعتماد المؤجل:</span>
                <span className="font-semibold text-[#12372a]">
                  {followUp ? followUp.date : 'لم يُعتمد بعد'}
                </span>
              </div>
            </div>
          </div>

          {/* Spaced Review Progress (if learned) */}
          {firstNewPass && (
            <div className="space-y-2">
              <h3 className="font-bold text-[#12372a] text-xs font-cairo flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#c59b27]" />
                جدول الاستحقاقات المتباعدة (+1، +3، +7، +14، +30)
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {spacedSchedule.map(s => (
                  <div
                    key={s.offset}
                    className={`p-2 rounded-xl border text-center ${
                      s.done
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-[#faf8f2] border-[#e4decb] text-[#526359]'
                    }`}
                  >
                    <span className="font-bold text-xs block mb-0.5">D+{s.offset}</span>
                    <span className="text-[10px] block opacity-80">{s.dueDate}</span>
                    <span className="text-[9px] mt-1 block font-semibold">
                      {s.done ? '✓ تم' : 'قادم'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recitation Logs History */}
          <div className="space-y-2">
            <h3 className="font-bold text-[#12372a] text-xs font-cairo flex items-center justify-between">
              <span>سجل جلسات التسميع ({pageEvents.length})</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenRecitation(page, firstNewPass ? 'review' : 'new');
                }}
                className="text-[#1b4d36] hover:underline font-semibold text-[11px]"
              >
                + إضافة تسميع
              </button>
            </h3>

            {pageEvents.length > 0 ? (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {pageEvents.map((e, idx) => (
                  <div
                    key={e.id || idx}
                    className="p-2.5 rounded-lg border border-[#e8e3d5] bg-white flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#12372a]">{e.date}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f4f0e6] text-[#526359]">
                          {e.type === 'new'
                            ? 'حفظ جديد'
                            : e.type === 'review'
                            ? 'مراجعة'
                            : e.type === 'old'
                            ? 'ورد قديم'
                            : 'تثبيت'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            passed(e) ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {passed(e) ? '✓ نجاح كامل' : '✗ يحتاج تثبيت'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6f7e75]">
                        تلقين: {e.prompts} · تصحيح ذاتي: {e.selfCorrections} · خطأ متكرر:{' '}
                        {e.repeatedError ? 'نعم' : 'لا'} · {e.timeMinutes ?? 0} دقيقة
                      </div>
                      {e.notes && <div className="text-[10px] text-[#7d8c82] italic font-amiri">«{e.notes}»</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-[#fbf9f4] rounded-lg border border-dashed border-[#d8d2c4] text-[#6f7e75]">
                لا توجد سجلات تسميع لهذا الوجه حتى الآن
              </div>
            )}
          </div>

          {/* Associated Errors/Mutashabihat */}
          {pageErrors.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-[#12372a] text-xs font-cairo">
                الأخطاء والمتشابهات المسجلة لهذا الوجه ({pageErrors.length})
              </h3>
              <div className="space-y-1.5">
                {pageErrors.map(err => (
                  <div
                    key={err.id}
                    className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs text-amber-950 space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>سورة {err.surahName} (آية {err.ayahNumber})</span>
                      <span className="text-[10px] text-amber-800">
                        {err.resolved ? '✓ تم الحل' : 'قيد المتابعة'}
                      </span>
                    </div>
                    <div className="text-[11px] font-amiri">السياق: «{err.contextSnippet}»</div>
                    <div className="text-[11px] font-amiri text-[#1b4d36]">
                      الصواب من المصحف: {err.correctionFromMushaf}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#fbf9f4] border-t border-[#e8e3d5] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#4b5a52] hover:bg-[#ede7d7] rounded-lg transition-colors"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRecitation(page, firstNewPass ? 'review' : 'new');
            }}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#12372a] hover:bg-[#1b4d36] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#c59b27]" />
            تسجيل تسميع الآن
          </button>
        </div>
      </div>
    </div>
  );
};
