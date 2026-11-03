import React, { useState, useRef } from 'react';
import {
  ErrorLogItem,
  QuranPlanSeed,
  QuranPageIndexItem,
  UserSettings,
} from '../types/quranPlan';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Download,
  Upload,
  Settings as SettingsIcon,
  RotateCcw,
  Plus,
  ShieldCheck,
  FileJson,
  User,
  Clock,
  Sparkles,
  ExternalLink,
  Info,
} from 'lucide-react';
import { validateSeed } from '../lib/hifzCore';
import { exportBackupJSON, importBackupJSON } from '../lib/storage';

interface MoreTabProps {
  seed: QuranPlanSeed;
  errors: ErrorLogItem[];
  settings: UserSettings;
  pageIndex: QuranPageIndexItem[];
  onSaveError: (error: ErrorLogItem) => void;
  onDeleteError: (id: string) => void;
  onOpenErrorModal: (error?: ErrorLogItem, defaultPage?: number) => void;
  onUpdateSettings: (settings: UserSettings) => void;
  onImportSeed: (seed: QuranPlanSeed) => void;
  onRestoreBackup: (backupText: string) => boolean;
  onResetAllData: () => void;
  onToggleDemoMode: () => void;
  onReloadBundledSeed: () => void;
}

export const MoreTab: React.FC<MoreTabProps> = ({
  seed,
  errors,
  settings,
  pageIndex,
  onSaveError,
  onDeleteError,
  onOpenErrorModal,
  onUpdateSettings,
  onImportSeed,
  onRestoreBackup,
  onResetAllData,
  onToggleDemoMode,
  onReloadBundledSeed,
}) => {
  const [activeSection, setActiveSection] = useState<'errors' | 'settings' | 'backup' | 'about'>('errors');
  const [errorSearch, setErrorSearch] = useState('');
  const [errorFilter, setErrorFilter] = useState<'all' | 'unresolved' | 'resolved' | 'high'>('all');

  // Settings form state
  const [availableMinutes, setAvailableMinutes] = useState(settings.dailyAvailableMinutes);
  const [reciterName, setReciterName] = useState(settings.reciterName);
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // File import inputs
  const seedFileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      dailyAvailableMinutes: Number(availableMinutes) || 120,
      reciterName: reciterName.trim(),
      teacherName: teacherName.trim(),
    });
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  const handleSeedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const check = validateSeed(parsed);
        if (check.valid && check.seed) {
          onImportSeed(check.seed);
          setImportStatus({
            success: true,
            message: `تم اعتماد وتحديث الخطة بنجاح (${parsed.profile?.targetPages?.length || 263} صفحة مستهدفة). لم يتم المساس بسجلاتك الفعلية.`,
          });
        } else {
          setImportStatus({
            success: false,
            message: `ملف الخطة غير مطابق للمعايير المعتمدة: ${check.error || 'هيكل غير صالح'}`,
          });
        }
      } catch (err: unknown) {
        setImportStatus({
          success: false,
          message: `خطأ في قراءة صيغة JSON: ${err instanceof Error ? err.message : 'تنسيق غير صالح'}`,
        });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const ok = onRestoreBackup(text);
        if (ok) {
          setImportStatus({
            success: true,
            message: 'تمت استعادة النسخة الاحتياطية بنجاح!',
          });
        } else {
          setImportStatus({
            success: false,
            message: 'فشلت الاستعادة. تأكد من أن الملف نسخة احتياطية صالحة لتطبيق ثبات.',
          });
        }
      } catch {
        setImportStatus({
          success: false,
          message: 'تعذر تحليل ملف النسخة الاحتياطية.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredErrors = errors.filter((err) => {
    if (errorFilter === 'unresolved' && err.resolved) return false;
    if (errorFilter === 'resolved' && !err.resolved) return false;
    if (errorFilter === 'high' && err.severity !== 'high') return false;

    if (!errorSearch.trim()) return true;
    const q = errorSearch.toLowerCase();
    return (
      err.surahName.toLowerCase().includes(q) ||
      err.page.toString().includes(q) ||
      err.contextSnippet.toLowerCase().includes(q) ||
      err.correctionFromMushaf.toLowerCase().includes(q) ||
      (err.notes && err.notes.toLowerCase().includes(q))
    );
  });

  const unresolvedCount = errors.filter((e) => !e.resolved).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Sub Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-[#12372A]/10 pb-3">
        <button
          onClick={() => setActiveSection('errors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'errors'
              ? 'bg-[#12372A] text-[#FBF9F4] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-[#FBF9F4] border border-[#12372A]/15'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-[#C59B27]" />
          <span>دفتر المتشابهات والأخطاء</span>
          {unresolvedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-mono">
              {unresolvedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSection('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'settings'
              ? 'bg-[#12372A] text-[#FBF9F4] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-[#FBF9F4] border border-[#12372A]/15'
          }`}
        >
          <SettingsIcon className="w-4 h-4 text-[#C59B27]" />
          <span>الإعدادات والتخصيص</span>
        </button>

        <button
          onClick={() => setActiveSection('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'backup'
              ? 'bg-[#12372A] text-[#FBF9F4] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-[#FBF9F4] border border-[#12372A]/15'
          }`}
        >
          <Download className="w-4 h-4 text-[#C59B27]" />
          <span>النسخ الاحتياطي والمزامنة</span>
        </button>

        <button
          onClick={() => setActiveSection('about')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'about'
              ? 'bg-[#12372A] text-[#FBF9F4] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-[#FBF9F4] border border-[#12372A]/15'
          }`}
        >
          <Info className="w-4 h-4 text-[#C59B27]" />
          <span>عن التطبيق والتوثيق</span>
        </button>
      </div>

      {/* SECTION 1: ERRORS NOTEBOOK */}
      {activeSection === 'errors' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#12372A]/15 shadow-sm">
            <div>
              <h2 className="font-serif text-base font-bold text-[#12372A]">
                دفتر المتشابهات وضبط الأخطاء
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                سجل دقيق لمواضع اللبس والانتقال، ليتم تكرارها حتى ترتكز في الصدر كالفاتحة
              </p>
            </div>
            <button
              onClick={() => onOpenErrorModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#12372A] text-[#FBF9F4] hover:bg-[#1A4D3B] rounded-xl text-xs font-bold shadow transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#C59B27]" />
              <span>توثيق موضع جديد</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-2xl border border-[#12372A]/15">
            <input
              type="text"
              value={errorSearch}
              onChange={(e) => setErrorSearch(e.target.value)}
              placeholder="ابحث برقم الصفحة، السورة، أو جزء من الآية..."
              className="flex-1 px-3 py-1.5 bg-[#FBF9F4] border border-[#12372A]/15 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#12372A]"
            />
            <div className="flex gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'unresolved', label: `يحتاج تمكين (${unresolvedCount})` },
                { id: 'resolved', label: 'تم تمكينه' },
                { id: 'high', label: 'شديد الأهمية' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setErrorFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    errorFilter === f.id
                      ? 'bg-[#12372A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Errors List */}
          {filteredErrors.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#12372A]/15 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-[#C59B27] mx-auto opacity-70" />
              <p className="text-sm font-bold text-[#12372A]">لا توجد أخطاء مسجلة تطابق البحث</p>
              <p className="text-xs text-gray-500">
                الحفظ المتقن يبدأ من حصر مواضع اللبس. استخدم زر "توثيق موضع جديد" عند أي تردد أو تعثر.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredErrors.map((err) => (
                <div
                  key={err.id}
                  className={`bg-white p-4 rounded-2xl border transition-all ${
                    err.resolved
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-[#12372A]/15 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-[#12372A]">
                        سورة {err.surahName}
                      </span>
                      <span className="text-xs text-gray-500">· الآية {err.ayahNumber}</span>
                      <span className="text-xs text-gray-500">· ص {err.page}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {err.severity === 'high' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">
                          شديد
                        </span>
                      )}
                      <button
                        onClick={() =>
                          onSaveError({
                            ...err,
                            resolved: !err.resolved,
                            resolvedDate: !err.resolved ? new Date().toISOString().split('T')[0] : undefined,
                          })
                        }
                        className={`text-xs p-1 rounded-lg transition-colors ${
                          err.resolved
                            ? 'text-emerald-700 hover:bg-emerald-100'
                            : 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={err.resolved ? 'إلغاء التمكين' : 'تحديد كـ تم تمكينه'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {err.contextSnippet && (
                      <div className="p-2 bg-red-50/60 rounded-xl border border-red-100 text-red-950 font-serif">
                        <span className="font-bold text-red-800 text-[11px] block mb-0.5">موضع اللبس:</span>
                        «{err.contextSnippet}»
                      </div>
                    )}

                    {err.correctionFromMushaf && (
                      <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 text-emerald-950 font-serif">
                        <span className="font-bold text-emerald-800 text-[11px] block mb-0.5">
                          الصواب المعتمد من المصحف:
                        </span>
                        «{err.correctionFromMushaf}»
                      </div>
                    )}

                    {err.notes && (
                      <p className="text-gray-600 italic text-[11px]">
                        ضابط التمييز: {err.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span>إعادة الاختبار: {err.retestDate}</span>
                    <button
                      onClick={() => onOpenErrorModal(err, err.page)}
                      className="text-[#12372A] font-semibold hover:underline"
                    >
                      تعديل / تفاصيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SETTINGS */}
      {activeSection === 'settings' && (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-[#12372A]/15 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-[#12372A]/10 pb-3">
            <SettingsIcon className="w-5 h-5 text-[#C59B27]" />
            <h2 className="font-serif text-base font-bold text-[#12372A]">إعدادات الخطة والتسميع</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#12372A] mb-1">
                الوقت المتاح يومياً للتسميع والمراجعة (بالدقائق)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={30}
                  max={480}
                  step={5}
                  value={availableMinutes}
                  onChange={(e) => setAvailableMinutes(parseInt(e.target.value) || 120)}
                  className="w-full px-3 py-2 bg-[#FBF9F4] border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
                />
                <span className="absolute left-3 top-2 text-xs text-gray-500 font-medium">دقيقة/يومياً</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                الافتراضي: 120 دقيقة (ساعتان يومياً تكفي لتسميع الجديد + مراجعة القريب + ورد الـ 15 صفحة)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12372A] mb-1">اسم الحافظ / الطالب</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={reciterName}
                  onChange={(e) => setReciterName(e.target.value)}
                  placeholder="مثال: عبد الرحمن"
                  className="w-full pr-9 pl-3 py-2 bg-[#FBF9F4] border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12372A] mb-1">
                اسم الشيخ المجيز / المعلم المقرئ
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="مثال: فضيلة الشيخ المقرئ"
                  className="w-full pr-9 pl-3 py-2 bg-[#FBF9F4] border border-[#12372A]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#12372A]"
                />
              </div>
            </div>

            {settingsSavedToast && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                تم حفظ الإعدادات بنجاح
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#12372A] hover:bg-[#1A4D3B] text-[#FBF9F4] text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-[#C59B27]" />
              حفظ التعديلات
            </button>
          </form>

          {/* Toggle Demo Mode section */}
          <div className="pt-4 border-t border-[#12372A]/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#12372A]">وضع العرض التجريبي (Demo Mode)</p>
                <p className="text-[11px] text-gray-500">
                  تحميل 10 صفحات معتمدة لاختبار نسب الإنجاز ورسم المصحف فوراً
                </p>
              </div>
              <button
                onClick={onToggleDemoMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  settings.useDemoData
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {settings.useDemoData ? 'تعطيل الوضع التجريبي' : 'تفعيل الوضع التجريبي'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: BACKUP & SYNC */}
      {activeSection === 'backup' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {importStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                importStatus.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {importStatus.message}
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-[#12372A]/15 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-[#C59B27]" />
              <div>
                <h3 className="font-serif text-sm font-bold text-[#12372A]">
                  تصدير نسخة احتياطية كاملة (Backup JSON)
                </h3>
                <p className="text-xs text-gray-500">
                  احفظ نسخة من جميع جلساتك، الأخطاء الموثقة، مسار الدوران القديم، والإعدادات بملف آمن
                </p>
              </div>
            </div>
            <button
              onClick={exportBackupJSON}
              className="w-full py-2.5 bg-[#12372A] hover:bg-[#1A4D3B] text-[#FBF9F4] text-xs font-bold rounded-xl transition-all shadow flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-[#C59B27]" />
              تحميل ملف النسخة الاحتياطية الآن
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#12372A]/15 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#C59B27]" />
              <div>
                <h3 className="font-serif text-sm font-bold text-[#12372A]">
                  استعادة نسخة احتياطية سابقة
                </h3>
                <p className="text-xs text-gray-500">
                  استرجع جلساتك وأخطاءك السابقة من ملف نسخ احتياطي محفوظ
                </p>
              </div>
            </div>
            <input
              type="file"
              ref={backupFileInputRef}
              accept=".json"
              onChange={handleBackupFileUpload}
              className="hidden"
            />
            <button
              onClick={() => backupFileInputRef.current?.click()}
              className="w-full py-2.5 bg-white border border-[#12372A]/20 hover:bg-[#FBF9F4] text-[#12372A] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-[#12372A]" />
              اختر ملف النسخة الاحتياطية للاستعادة
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#12372A]/15 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-[#C59B27]" />
              <div>
                <h3 className="font-serif text-sm font-bold text-[#12372A]">
                  تحديث ملف الخطة الأساسية (Seed JSON)
                </h3>
                <p className="text-xs text-gray-500">
                  استيراد خطة معتمدة جديدة مطابقة لفهرس مجمع الملك فهد (مع التحقق الصارم من 604 صفحة و 6236 آية) دون مساس بسجلاتك
                </p>
              </div>
            </div>
            <input
              type="file"
              ref={seedFileInputRef}
              accept=".json"
              onChange={handleSeedFileUpload}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                onClick={() => seedFileInputRef.current?.click()}
                className="flex-1 py-2.5 bg-white border border-[#12372A]/20 hover:bg-[#FBF9F4] text-[#12372A] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <FileJson className="w-4 h-4 text-[#12372A]" />
                استيراد خطة جديدة من ملف
              </button>
              <button
                onClick={onReloadBundledSeed}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                title="إعادة تحميل الخطة الأساسية المدمجة"
              >
                الخطة الأصلية
              </button>
            </div>
          </div>

          {/* Destructive reset */}
          <div className="bg-red-50/60 p-6 rounded-2xl border border-red-200 space-y-3">
            <div className="flex items-center gap-2 text-red-900">
              <RotateCcw className="w-5 h-5 text-red-700" />
              <div>
                <h3 className="font-serif text-sm font-bold">تصفير سجلات الإنجاز والتسميع</h3>
                <p className="text-[11px] text-red-700">
                  حذف جميع جلسات التسميع والعودة إلى البداية (0% إنجاز). لا يؤثر على هيكل الخطة الأساسية.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('تحذير: هل أنت متأكد تماماً من رغبتك في حذف جميع جلسات التسميع والعودة إلى 0%؟ لا يمكن التراجع عن هذا الإجراء.')) {
                  onResetAllData();
                }
              }}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all"
            >
              تأكيد تصفير السجلات
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: ABOUT & ACCREDITATION */}
      {activeSection === 'about' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-[#12372A]/15 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#12372A]/10 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#12372A] flex items-center justify-center text-[#C59B27] font-serif font-black text-2xl shadow-sm">
              ث
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#12372A]">تطبيق ثبات · Thabat</h2>
              <p className="text-xs text-gray-600">
                منصة رقمية متخصصة لضبط وتثبيت القرآن الكريم قبل دخول رمضان 1448 هـ
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
            <div className="p-3 bg-[#FBF9F4] rounded-xl border border-[#12372A]/10 space-y-2">
              <p className="font-bold text-[#12372A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
                بيانات المصحف المعتمدة والمتحقق منها:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600 pr-2">
                <li>الناشر: مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة</li>
                <li>الرواية: حفص عن عاصم (مصحف المدينة النبوية، 604 صفحات)</li>
                <li>إجمالي الآيات المفهرسة رقمياً: 6236 آية متحققة بدون أي انقطاع</li>
                <li>النطاق المستهدف: من سورة المؤمنون (ص 342) حتى سورة الناس (ص 604) = 263 صفحة</li>
              </ul>
            </div>

            <div className="p-3 bg-[#FBF9F4] rounded-xl border border-[#12372A]/10 space-y-2">
              <p className="font-bold text-[#12372A] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#C59B27]" />
                المنهجية العلمية والضوابط الصارمة:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600 pr-2">
                <li>
                  <strong className="text-[#12372A]">قاعدة التثبيت المشروط (Delayed Approval):</strong> التسميع الأول يضع الصفحة "قيد التثبيت"، ولا تُعتمد نهائياً في نسبة الإنجاز إلا بعد تسميع ناجح ومتقن في يوم تقويمي لاحق.
                </li>
                <li>
                  <strong className="text-[#12372A]">المراجعة المتباعدة:</strong> جدولة تلقائية للمراجعات بعد (+1، +3، +7، +14، +30) يوماً من الحفظ الأول.
                </li>
                <li>
                  <strong className="text-[#12372A]">الدوران القديم (Old Cycle):</strong> ورد يومي ثابت قدره 15 صفحة من المحفوظ القديم (الصفحات 1 إلى 341)، يُستكمل في دورات متتابعة كل 23 يوماً.
                </li>
                <li>
                  <strong className="text-[#12372A]">حسابات قطعية:</strong> لا مجال للتقديرات أو الذكاء الاصطناعي التوليدي في حساب نسب الإنجاز أو إجازة التسميع، فكل المعايير رياضية دقيقة.
                </li>
              </ul>
            </div>

            <div className="p-3 bg-[#FBF9F4] rounded-xl border border-[#12372A]/10 space-y-1 text-[11px] text-gray-600">
              <p className="font-bold text-[#12372A]">الجدول الزمني والهدف:</p>
              <p>تاريخ بدء الخطة: الأربعاء 1448/05/23 هـ (2026/11/04 م)</p>
              <p>الهدف المنشود: استكمال الحفظ والمراجعة قبل غرة رمضان 1448 هـ (الموافق 8 فبراير 2027 م إن شاء الله)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
