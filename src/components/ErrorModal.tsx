import React, { useState } from 'react';
import { ErrorLogItem, ErrorType, QuranPageIndexItem } from '../types/quranPlan';
import { X, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';
import { addDays, todayInRiyadh } from '../lib/hifzCore';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageIndex: QuranPageIndexItem[];
  defaultPage?: number;
  initialError?: ErrorLogItem | null;
  onSave: (error: ErrorLogItem) => void;
  onDelete?: (id: string) => void;
}

const ERROR_TYPES: { type: ErrorType; label: string; desc: string }[] = [
  { type: 'transition', label: 'انتقال / متشابهات', desc: 'لبس بين موضعين متشابهين في السورة أو سور أخرى' },
  { type: 'word', label: 'لفظ / كلمة', desc: 'نسيان أو استبدال كلمة بأخرى' },
  { type: 'order', label: 'ترتيب آيات', desc: 'تقديم أو تأخير آية عن موضعها' },
  { type: 'verse_end', label: 'فواصل / رؤوس الآيات', desc: 'خطأ في خاتمة الآية (الأسماء الحسنى)' },
  { type: 'harakah', label: 'ضبط وحركات', desc: 'لحن جلي أو خفي في التشكيل أو البناء' },
  { type: 'other', label: 'أخرى', desc: 'توقف مفاجئ أو تردد' },
];

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  pageIndex,
  defaultPage = 342,
  initialError,
  onSave,
  onDelete,
}) => {
  const today = todayInRiyadh();
  const [page, setPage] = useState<number>(initialError ? initialError.page : defaultPage);
  const [surahNumber, setSurahNumber] = useState<number>(initialError?.surahNumber || 23);
  const [surahName, setSurahName] = useState<string>(initialError?.surahName || 'المؤمنون');
  const [ayahNumber, setAyahNumber] = useState<number>(initialError?.ayahNumber || 1);
  const [errorType, setErrorType] = useState<ErrorType>(initialError?.errorType || 'transition');
  const [contextSnippet, setContextSnippet] = useState<string>(initialError?.contextSnippet || '');
  const [correctionFromMushaf, setCorrectionFromMushaf] = useState<string>(initialError?.correctionFromMushaf || '');
  const [severity, setSeverity] = useState<'high' | 'medium' | 'low'>(initialError?.severity || 'medium');
  const [retestDate, setRetestDate] = useState<string>(initialError?.retestDate || addDays(today, 1));
  const [resolved, setResolved] = useState<boolean>(initialError?.resolved || false);
  const [notes, setNotes] = useState<string>(initialError?.notes || '');

  if (!isOpen) return null;

  // Auto-fill surahs on page change
  const pageData = pageIndex.find((p) => p.page === page);
  const availableSurahs = pageData?.segments || [];

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const pd = pageIndex.find((p) => p.page === newPage);
    if (pd && pd.segments.length > 0) {
      setSurahNumber(pd.segments[0].surah);
      setSurahName(pd.segments[0].surahName);
      setAyahNumber(pd.segments[0].fromAyah);
    }
  };

  const handleSurahChange = (sNum: number) => {
    setSurahNumber(sNum);
    const seg = availableSurahs.find((s) => s.surah === sNum);
    if (seg) {
      setSurahName(seg.surahName);
      setAyahNumber(seg.fromAyah);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextSnippet.trim() && !correctionFromMushaf.trim()) {
      return;
    }
    const item: ErrorLogItem = {
      id: initialError?.id || `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: initialError?.date || today,
      page,
      surahNumber,
      surahName,
      ayahNumber,
      errorType,
      contextSnippet: contextSnippet.trim(),
      correctionFromMushaf: correctionFromMushaf.trim(),
      severity,
      retestDate,
      resolved,
      resolvedDate: resolved ? (initialError?.resolvedDate || today) : undefined,
      notes: notes.trim() || undefined,
    };
    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#FDFCF7] border border-[#12372A]/15 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-[#1F2937]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#12372A] text-[#FBF9F4] border-b border-[#C59B27]/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#C59B27]/20 rounded-lg text-[#FBF9F4]">
              <AlertTriangle className="w-5 h-5 text-[#C59B27]" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold">
                {initialError ? 'تعديل موضع الخطأ / المتشابهات' : 'توثيق خطأ أو ضبط متشابه'}
              </h2>
              <p className="text-xs text-white/70">
                توثيق الأخطاء بدقة يعينك على تجنب تكرارها واستحضار مواضع اللبس
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Page, Surah & Ayah */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12372A] mb-1">
                رقم الصفحة بالمصحف
              </label>
              <input
                type="number"
                min={1}
                max={604}
                value={page}
                onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12372A] mb-1">السورة</label>
              <select
                value={surahNumber}
                onChange={(e) => handleSurahChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
              >
                {availableSurahs.length > 0 ? (
                  availableSurahs.map((seg) => (
                    <option key={seg.surah} value={seg.surah}>
                      سورة {seg.surahName} ({seg.surah})
                    </option>
                  ))
                ) : (
                  <option value={surahNumber}>{surahName}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12372A] mb-1">رقم الآية</label>
              <input
                type="number"
                min={1}
                max={300}
                value={ayahNumber}
                onChange={(e) => setAyahNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
                required
              />
            </div>
          </div>

          {/* Error Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#12372A] mb-2">نوع الخطأ أو اللبس</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ERROR_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.type}
                  onClick={() => setErrorType(t.type)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    errorType === t.type
                      ? 'border-[#12372A] bg-[#12372A]/10 ring-1 ring-[#12372A]'
                      : 'border-[#12372A]/15 bg-white hover:bg-[#FBF9F4]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#12372A]">{t.label}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Context Snippet (What was read or where it tripped) */}
          <div>
            <label className="block text-xs font-semibold text-[#12372A] mb-1">
              ما تُلِي بالخطأ أو موضع الإشكال
            </label>
            <textarea
              rows={2}
              value={contextSnippet}
              onChange={(e) => setContextSnippet(e.target.value)}
              placeholder="مثال: قراءة 'إلا إبليس أَبَى وَاسْتَكْبَرَ' بدل 'إلا إبليس كَانَ مِنَ الكَافِرِينَ'..."
              className="w-full px-3 py-2 bg-white border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
            />
          </div>

          {/* Mushaf Correction */}
          <div>
            <label className="block text-xs font-semibold text-[#12372A] mb-1">
              الصواب المعتمد من المصحف الشريف
            </label>
            <textarea
              rows={2}
              value={correctionFromMushaf}
              onChange={(e) => setCorrectionFromMushaf(e.target.value)}
              placeholder="اكتب الآية أو العبارة الصحيحة وضابط المتشابه..."
              className="w-full px-3 py-2 bg-white border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
            />
          </div>

          {/* Severity & Retest Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12372A] mb-1.5">مستوى الخطورة</label>
              <div className="flex gap-2">
                {[
                  { id: 'low', label: 'طفيف', color: 'border-emerald-300 text-emerald-800' },
                  { id: 'medium', label: 'متوسط', color: 'border-amber-300 text-amber-800' },
                  { id: 'high', label: 'شديد (يحتاج تركيز)', color: 'border-red-300 text-red-800' },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSeverity(s.id as 'high' | 'medium' | 'low')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      severity === s.id
                        ? 'bg-[#12372A] text-white border-[#12372A]'
                        : `bg-white hover:bg-gray-50 ${s.color}`
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12372A] mb-1">
                تاريخ إعادة الاختبار والتمكين
              </label>
              <input
                type="date"
                value={retestDate}
                onChange={(e) => setRetestDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
              />
            </div>
          </div>

          {/* Resolved Checkbox (if editing or solved) */}
          <div className="pt-2 border-t border-[#12372A]/10 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={resolved}
                onChange={(e) => setResolved(e.target.checked)}
                className="w-4 h-4 text-[#12372A] border-gray-300 rounded focus:ring-[#12372A]"
              />
              <span className="text-xs font-semibold text-[#12372A]">
                تم تمكين الموضع وتجاوز اللبس بنجاح
              </span>
            </label>
            {resolved && (
              <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> تم التمكين
              </span>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#12372A] mb-1">
              ملاحظة الشيخ أو ضابط التمييز
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: الموضع الأول بحرف الواو، والموضع الثاني بلا واو"
              className="w-full px-3 py-2 bg-white border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#12372A]/10">
            {initialError && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل أنت متأكد من حذف هذا التوثيق؟')) {
                    onDelete(initialError.id);
                    onClose();
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                حذف الموضع
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-xs font-bold text-[#FBF9F4] bg-[#12372A] hover:bg-[#1A4D3B] rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4 text-[#C59B27]" />
                {initialError ? 'حفظ التعديلات' : 'توثيق الموضع'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
