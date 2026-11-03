/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Clock, User, BookOpen, Trash2 } from 'lucide-react';
import { QuranPlanSeed, RecitationEvent, RecitationType } from '../types/quranPlan';
import { passed, getPageContentSummary, todayInRiyadh } from '../lib/hifzCore';

interface RecitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: number;
  initialDate: string;
  defaultType?: RecitationType;
  seed: QuranPlanSeed;
  existingEvent?: RecitationEvent;
  onSave: (event: RecitationEvent) => void;
  onDelete?: (eventId: string) => void;
}

export const RecitationModal: React.FC<RecitationModalProps> = ({
  isOpen,
  onClose,
  page,
  initialDate,
  defaultType = 'new',
  seed,
  existingEvent,
  onSave,
  onDelete,
}) => {
  const [date, setDate] = useState(initialDate);
  const [type, setType] = useState<RecitationType>(defaultType);
  const [withoutLooking, setWithoutLooking] = useState(true);
  const [prompts, setPrompts] = useState(0);
  const [selfCorrections, setSelfCorrections] = useState(0);
  const [repeatedError, setRepeatedError] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState<number>(type === 'new' ? 20 : 3);
  const [reciterTeacher, setReciterTeacher] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (existingEvent) {
      setDate(existingEvent.date);
      setType(existingEvent.type);
      setWithoutLooking(existingEvent.withoutLooking);
      setPrompts(existingEvent.prompts);
      setSelfCorrections(existingEvent.selfCorrections);
      setRepeatedError(existingEvent.repeatedError);
      setTimeMinutes(existingEvent.timeMinutes ?? (existingEvent.type === 'new' ? 20 : 3));
      setReciterTeacher(existingEvent.reciterTeacher ?? '');
      setNotes(existingEvent.notes ?? '');
    } else {
      setDate(initialDate);
      setType(defaultType);
      setWithoutLooking(true);
      setPrompts(0);
      setSelfCorrections(0);
      setRepeatedError(false);
      setTimeMinutes(defaultType === 'new' ? 20 : 3);
      setReciterTeacher('');
      setNotes('');
    }
    setErrorMsg('');
  }, [existingEvent, initialDate, defaultType, isOpen]);

  if (!isOpen) return null;

  // Real-time evaluation of whether current parameters pass
  const tempEvent: RecitationEvent = {
    id: existingEvent?.id || 'temp',
    page,
    date,
    type,
    passed: true,
    withoutLooking,
    prompts,
    selfCorrections,
    repeatedError,
    timeMinutes,
    reciterTeacher,
    notes,
  };
  const isPassingStandard = passed(tempEvent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const eventToSave: RecitationEvent = {
      id: existingEvent?.id || `recitation-${page}-${date}-${Date.now()}`,
      page,
      date,
      type,
      passed: isPassingStandard,
      withoutLooking,
      prompts,
      selfCorrections,
      repeatedError,
      timeMinutes: Number(timeMinutes) || 0,
      reciterTeacher: reciterTeacher.trim() || undefined,
      notes: notes.trim() || undefined,
      recordedAt: existingEvent?.recordedAt || new Date().toISOString(),
    };

    onSave(eventToSave);
    onClose();
  };

  const summary = getPageContentSummary(page, seed);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recitation-modal-title"
    >
      <div className="bg-[#ffffff] text-[#1c2a22] w-full max-w-lg rounded-2xl shadow-2xl border border-[#e8e3d5] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#12372a] text-[#fbf9f4] px-6 py-4 flex items-center justify-between border-b border-[#1b4d36]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#c59b27]" />
            <div>
              <h2 id="recitation-modal-title" className="text-lg font-bold font-cairo">
                تسجيل تسميع الوجه {page}
              </h2>
              <p className="text-xs text-[#dfc882] font-amiri">{summary}</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Recitation Status Badge */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
              isPassingStandard
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            {isPassingStandard ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-xs mb-0.5">
                {isPassingStandard
                  ? 'مستوفٍ لمعيار النجاح العملي (ناجح)'
                  : 'غير مستوفٍ لمعيار النجاح (يحتاج تثبيتًا)'}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {isPassingStandard
                  ? 'تسميع غيبًا كامل، صفر تلقين، تصحيح ذاتي عابر واحد كحد أقصى، ودون خطأ متكرر.'
                  : 'إذا وُجد تلقين أو أكثر من تصحيح واحد أو خطأ متكرر، يُسجل الوجه كـ «يحتاج تثبيتًا» لضمان الإتقان المتين.'}
              </p>
            </div>
          </div>

          {/* Date & Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#12372a] mb-1.5">
                تاريخ التسميع الفعلي
              </label>
              <input
                type="date"
                required
                value={date}
                max={todayInRiyadh()}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#d8d2c4] rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d36] focus:border-transparent outline-none bg-[#faf8f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12372a] mb-1.5">
                نوع الجلسة
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as RecitationType)}
                className="w-full px-3 py-2 border border-[#d8d2c4] rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d36] focus:border-transparent outline-none bg-[#faf8f2]"
              >
                <option value="new">حفظ جديد (أول تسميع)</option>
                <option value="review">مراجعة متباعدة / يوم لاحق</option>
                <option value="old">ورد دورة القديم (١٥ وجهاً)</option>
                <option value="consolidation">تثبيت ختامي شامل</option>
                <option value="assessment">تقييم واختبار</option>
              </select>
            </div>
          </div>

          {/* Quality Criteria */}
          <div className="bg-[#fbf9f4] p-4 rounded-xl border border-[#e8e3d5] space-y-3.5">
            <h3 className="text-xs font-bold text-[#12372a] flex items-center justify-between">
              <span>معايير جودة التسميع</span>
              <span className="text-[11px] font-normal text-[#6f7e75]">المعيار العملي المعتمد</span>
            </h3>

            {/* Without looking checkbox */}
            <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-[#f2eee3] transition-colors">
              <span className="text-xs text-[#1c2a22]">تسميع كامل غيبًا بدون نظر للمصحف</span>
              <input
                type="checkbox"
                checked={withoutLooking}
                onChange={e => setWithoutLooking(e.target.checked)}
                className="w-4 h-4 rounded text-[#1b4d36] focus:ring-[#1b4d36] accent-[#1b4d36]"
              />
            </label>

            {/* Prompts counter */}
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#f2eee3] transition-colors">
              <div>
                <span className="text-xs text-[#1c2a22] block">عدد التلقينات (فتح أو تنبيه خارجي)</span>
                <span className="text-[10px] text-[#7d8c82]">النجاح يشترط صفر تلقين</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map(val => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setPrompts(val)}
                    className={`w-7 h-7 text-xs font-semibold rounded-md transition-colors ${
                      prompts === val
                        ? 'bg-[#12372a] text-[#fbf9f4] shadow-sm'
                        : 'bg-[#e8e3d5] text-[#1c2a22] hover:bg-[#dcd6c5]'
                    }`}
                  >
                    {val === 3 ? '+3' : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Self-corrections counter */}
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#f2eee3] transition-colors">
              <div>
                <span className="text-xs text-[#1c2a22] block">التصحيحات الذاتية العابرة</span>
                <span className="text-[10px] text-[#7d8c82]">يُسمح بتصحيح ذاتي واحد كحد أقصى</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(val => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setSelfCorrections(val)}
                    className={`w-7 h-7 text-xs font-semibold rounded-md transition-colors ${
                      selfCorrections === val
                        ? 'bg-[#12372a] text-[#fbf9f4] shadow-sm'
                        : 'bg-[#e8e3d5] text-[#1c2a22] hover:bg-[#dcd6c5]'
                    }`}
                  >
                    {val === 2 ? '+2' : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Repeated error toggle */}
            <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-[#f2eee3] transition-colors">
              <div>
                <span className="text-xs text-[#1c2a22] block">تكرار الخطأ في الموضع نفسه</span>
                <span className="text-[10px] text-[#7d8c82]">إذا تكرر الخطأ يُعد الوجه غير متقن بعد</span>
              </div>
              <input
                type="checkbox"
                checked={repeatedError}
                onChange={e => setRepeatedError(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
              />
            </label>
          </div>

          {/* Time & Teacher & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#12372a] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#c59b27]" />
                الوقت المستغرق (بالدقائق)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={timeMinutes}
                onChange={e => setTimeMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-[#d8d2c4] rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d36] outline-none bg-[#faf8f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12372a] mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#c59b27]" />
                المسمّع / المعلم (اختياري)
              </label>
              <input
                type="text"
                placeholder="اسم الشيخ أو المسمّع"
                value={reciterTeacher}
                onChange={e => setReciterTeacher(e.target.value)}
                className="w-full px-3 py-2 border border-[#d8d2c4] rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d36] outline-none bg-[#faf8f2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12372a] mb-1.5">
              ملاحظات أو مواضع بحاجة لضبط
            </label>
            <textarea
              rows={2}
              placeholder="سجل أي كلمة استوقفتك أو موضع متشابه..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-[#d8d2c4] rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d36] outline-none bg-[#faf8f2] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#e8e3d5]">
            {existingEvent && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                    onDelete(existingEvent.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف السجل
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#4b5a52] hover:bg-[#f0ebe0] rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#12372a] hover:bg-[#1b4d36] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#c59b27]" />
                حفظ التسميع
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
