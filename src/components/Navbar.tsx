/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { getHijriDisplay } from '../lib/hifzCore';

export type TabKey = 'today' | 'plan' | 'review' | 'progress' | 'more';

export interface NavbarProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  currentDate: string;
  isDemo: boolean;
  onToggleDemo: () => void;
  overdueCount: number;
  weakCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentDate,
  isDemo,
  onToggleDemo,
  overdueCount,
  weakCount,
}) => {
  const hijriText = getHijriDisplay(currentDate);

  const tabs = [
    { id: 'today' as const, label: 'اليوم', badge: overdueCount > 0 ? overdueCount : undefined },
    { id: 'plan' as const, label: 'الخطة' },
    { id: 'review' as const, label: 'المراجعة', badge: weakCount > 0 ? `${weakCount} ضعيف` : undefined },
    { id: 'progress' as const, label: 'التقدم' },
    { id: 'more' as const, label: 'المزيد' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#12372a] text-[#fbf9f4] border-b border-[#1b4d36] shadow-md">
      {/* Top Banner */}
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[#184a37]">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#c59b27]" aria-hidden="true" />
          <span className="font-medium text-[#ede7d7]">
            {currentDate} م <span className="text-[#a8b8af] mx-1">/</span> {hijriText || 'ربيع الآخر ١٤٤٨هـ'}
          </span>
          <span className="text-[#a8b8af] hidden sm:inline">(توقيت مكة المكرمة)</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[#dfc882] text-[11px] font-medium hidden md:block">
            رمضان ١٤٤٨ المتوقع: ٨ فبراير ٢٠٢٧ م (تقويمي)
          </div>

          <button
            onClick={onToggleDemo}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              isDemo
                ? 'bg-[#c59b27] text-[#12372a] font-bold shadow-sm'
                : 'bg-[#184a37] text-[#dfc882] hover:bg-[#20503b]'
            }`}
            title="تبديل بين السجل الفعلي وبيانات العرض التجريبية"
          >
            <Sparkles className="w-3 h-3" />
            {isDemo ? 'وضع التجربة نشط' : 'عرض تجريبي'}
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#184a37] border border-[#c59b27]/40 flex items-center justify-center text-[#c59b27] shadow-inner">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#fbf9f4] flex items-center gap-2 font-cairo">
              ثَبَات
              <span className="text-[11px] font-normal text-[#dfc882] border border-[#c59b27]/30 px-1.5 py-0.5 rounded">
                المؤمنون – الناس
              </span>
            </h1>
            <p className="text-[11px] text-[#a8b8af]">
              متابعة حفظ القرآن ومراجعته المتباعدة ودورة القديم
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1" aria-label="أقسام التطبيق الرئيسية">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#fbf9f4] text-[#12372a] shadow-sm font-semibold'
                    : 'text-[#ede7d7] hover:bg-[#184a37] hover:text-[#fbf9f4]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-[#c59b27] text-[#12372a]' : 'bg-[#c59b27] text-[#12372a]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
