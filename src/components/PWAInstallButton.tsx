import React, { useState } from 'react';
import { Smartphone, Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running inside installed standalone PWA, hide install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          onClick={handleInstallClick}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            isInstallable
              ? 'bg-[#C59B27] hover:bg-[#d8ab2e] text-[#12372A]'
              : 'bg-white/10 hover:bg-white/20 text-[#FBF9F4] border border-white/20'
          } ${className}`}
          title="تثبيت التطبيق كأيقونة على الجوال"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>تثبيت بالجوال</span>
        </button>
      ) : (
        <div className={`p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#12372A] flex items-center justify-center text-[#C59B27] font-serif font-black text-2xl shadow-sm shrink-0">
              ث
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-[#12372A]">
                تثبيت «ثبات» كأيقونة على الشاشة الرئيسية
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                افتح التطبيق مباشرة كأيقونة في جوالك بملء الشاشة مع حفظ البيانات بدون إنترنت
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#12372A] hover:bg-[#1A4D3B] text-[#FBF9F4] text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4 text-[#C59B27]" />
            <span>{isInstallable ? 'تثبيت التطبيق الآن' : 'طريقة التثبيت بالجوال'}</span>
          </button>
        </div>
      )}

      {/* Installation Guide Modal (for iOS Safari or manual instruction) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#FDFCF7] border border-[#12372A]/15 rounded-3xl shadow-2xl overflow-hidden text-[#1F2937]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#12372A] text-[#FBF9F4] border-b border-[#C59B27]/30">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#C59B27]" />
                <h3 className="font-serif text-base font-bold">
                  تثبيت «ثبات» كأيقونة على الجوال
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guide Steps */}
            <div className="p-6 space-y-4 text-xs leading-relaxed">
              <div className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-[#12372A] flex items-center justify-center text-[#C59B27] font-serif font-black text-xl shrink-0">
                  ث
                </div>
                <div>
                  <p className="font-bold text-[#12372A]">تطبيق ثبات للقرآن الكريم</p>
                  <p className="text-[11px] text-gray-600">يعمل بدون اتصال بالإنترنت كأي تطبيق أصيل</p>
                </div>
              </div>

              {isIOS ? (
                /* iOS Safari instructions */
                <div className="space-y-3">
                  <p className="font-bold text-[#12372A] text-sm">
                    خطوات التثبيت على أجهزة iPhone / iPad (متصفح Safari):
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-2.5 bg-white border border-gray-200 rounded-xl">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-700 shrink-0">
                        <Share className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <strong className="block text-gray-900 font-semibold mb-0.5">١. اضغط على زر المشاركة (Share)</strong>
                        <span className="text-[11px] text-gray-500">موجود في أسفل شاشة Safari (أو في الأعلى على iPad).</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 bg-white border border-gray-200 rounded-xl">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-700 shrink-0">
                        <PlusSquare className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <strong className="block text-gray-900 font-semibold mb-0.5">٢. اختر «إضافة إلى الشاشة الرئيسية»</strong>
                        <span className="text-[11px] text-gray-500">مرر للأسفل في القائمة واضغط على «Add to Home Screen».</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 bg-white border border-gray-200 rounded-xl">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-700 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-[#C59B27]" />
                      </div>
                      <div>
                        <strong className="block text-gray-900 font-semibold mb-0.5">٣. اضغط «إضافة» (Add) في الزاوية العلوية</strong>
                        <span className="text-[11px] text-gray-500">ستظهر أيقونة «ثبات» مباشرة على شاشة جوالك الرئيسية.</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Android / Chrome instructions */
                <div className="space-y-3">
                  <p className="font-bold text-[#12372A] text-sm">
                    خطوات التثبيت على أجهزة أندرويد وChrome:
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-2.5 bg-white border border-gray-200 rounded-xl">
                      <span className="w-6 h-6 rounded-full bg-[#12372A] text-[#FBF9F4] text-xs font-bold flex items-center justify-center shrink-0">
                        ١
                      </span>
                      <div>
                        <strong className="block text-gray-900 font-semibold mb-0.5">افتح قائمة الخيارات (الثلاث نقاط)</strong>
                        <span className="text-[11px] text-gray-500">في الزاوية العلوية أو السفلية للمتصفح.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 bg-white border border-gray-200 rounded-xl">
                      <span className="w-6 h-6 rounded-full bg-[#12372A] text-[#FBF9F4] text-xs font-bold flex items-center justify-center shrink-0">
                        ٢
                      </span>
                      <div>
                        <strong className="block text-gray-900 font-semibold mb-0.5">اضغط على «تثبيت التطبيق» أو «الإضافة إلى الشاشة الرئيسية»</strong>
                        <span className="text-[11px] text-gray-500">سيتم تنزيل الأيقونة وفتح التطبيق بشكل منفصل بملء الشاشة.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full mt-2 py-2.5 bg-[#12372A] hover:bg-[#1A4D3B] text-[#FBF9F4] text-xs font-bold rounded-xl transition-colors"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
