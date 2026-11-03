/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  QuranPlanSeed,
  RecitationEvent,
  ErrorLogItem,
  OldCycleState,
  UserSettings,
  PlanRoot,
  RecitationType,
} from './types/quranPlan';
import {
  loadStoredSeed,
  loadStoredEvents,
  saveStoredEvents,
  loadStoredErrors,
  saveStoredErrors,
  loadStoredOldCycle,
  saveStoredOldCycle,
  loadStoredSettings,
  saveStoredSettings,
  loadCustomPlan,
  saveCustomPlan,
  loadDemoEvents,
  loadDemoErrors,
  clearAllProgressData,
  importBackupJSON,
} from './lib/storage';
import { computeProgress, todayInRiyadh } from './lib/hifzCore';
import { Navbar, TabKey } from './components/Navbar';
import { TodayTab } from './components/TodayTab';
import { PlanTab } from './components/PlanTab';
import { ReviewTab } from './components/ReviewTab';
import { ProgressTab } from './components/ProgressTab';
import { MoreTab } from './components/MoreTab';
import { RecitationModal } from './components/RecitationModal';
import { PageDetailModal } from './components/PageDetailModal';
import { ErrorModal } from './components/ErrorModal';
import { RedistributeModal } from './components/RedistributeModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [currentDate, setCurrentDate] = useState<string>(todayInRiyadh());
  const [seed, setSeed] = useState<QuranPlanSeed | null>(null);
  const [customPlan, setCustomPlan] = useState<PlanRoot | null>(null);
  const [events, setEvents] = useState<RecitationEvent[]>([]);
  const [errors, setErrors] = useState<ErrorLogItem[]>([]);
  const [oldCycle, setOldCycle] = useState<OldCycleState>({
    currentPointerPage: 1,
    completedPagesInCurrentCycle: [],
    cycleIteration: 1,
  });
  const [settings, setSettings] = useState<UserSettings>({
    dailyAvailableMinutes: 120,
    reciterName: '',
    teacherName: '',
    useDemoData: false,
  });

  // Modals state
  const [recitationModal, setRecitationModal] = useState<{
    isOpen: boolean;
    page: number;
    type: RecitationType;
    defaultDate: string;
  }>({
    isOpen: false,
    page: 342,
    type: 'new',
    defaultDate: todayInRiyadh(),
  });

  const [detailModalPage, setDetailModalPage] = useState<number | null>(null);

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    defaultPage?: number;
    initialError?: ErrorLogItem | null;
  }>({
    isOpen: false,
    defaultPage: 342,
    initialError: null,
  });

  const [redistributeModalOpen, setRedistributeModalOpen] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    async function init() {
      const loadedSeed = await loadStoredSeed();
      setSeed(loadedSeed);
      const loadedPlan = loadCustomPlan();
      setCustomPlan(loadedPlan);
      const loadedSettings = loadStoredSettings();
      setSettings(loadedSettings);
      const loadedErrors = loadStoredErrors();
      setErrors(loadedErrors);
      const loadedOldCycle = loadStoredOldCycle();
      setOldCycle(loadedOldCycle);

      if (loadedSettings.useDemoData) {
        setEvents(loadDemoEvents());
        setErrors(loadDemoErrors());
        setOldCycle(loadStoredOldCycle());
        setCurrentDate('2026-11-07');
      } else {
        const loadedEvents = loadStoredEvents();
        setEvents(loadedEvents);
      }
    }
    init();
  }, []);

  const effectiveSeed = useMemo<QuranPlanSeed | null>(() => {
    if (!seed) return null;
    if (!customPlan) return seed;
    return {
      ...seed,
      plan: customPlan,
    };
  }, [seed, customPlan]);

  // Compute overall progress metrics
  const progressMetrics = useMemo(() => {
    if (!effectiveSeed) return null;
    return computeProgress(effectiveSeed, events, currentDate);
  }, [effectiveSeed, events, currentDate]);

  // Handle advance old cycle pages
  const handleAdvanceOldCycle = useCallback(
    (pagesCompleted: number[]) => {
      setOldCycle((prevCycle) => {
        const newSet = new Set([...prevCycle.completedPagesInCurrentCycle, ...pagesCompleted]);
        const completed = Array.from(newSet).sort((a, b) => a - b);
        const maxPage = Math.max(...pagesCompleted, 0);
        let nextPointer = prevCycle.currentPointerPage;
        if (maxPage >= nextPointer && nextPointer < 341) {
          nextPointer = Math.min(341, maxPage + 1);
        }
        let nextIteration = prevCycle.cycleIteration;
        if (completed.length >= 341) {
          nextIteration += 1;
        }

        const updated: OldCycleState = {
          currentPointerPage: nextPointer,
          completedPagesInCurrentCycle: completed,
          cycleIteration: nextIteration,
          lastRecitationDate: currentDate,
        };
        if (!settings.useDemoData) {
          saveStoredOldCycle(updated);
        }
        return updated;
      });
    },
    [currentDate, settings.useDemoData]
  );

  // Handle recording new recitation event
  const handleRecordRecitation = useCallback(
    (newEvent: RecitationEvent) => {
      setEvents((prev) => {
        const updated = [...prev.filter((e) => e.id !== newEvent.id), newEvent];
        if (!settings.useDemoData) {
          saveStoredEvents(updated);
        }

        // If this was an old cycle recitation, update oldCycle state
        if (newEvent.type === 'old' && newEvent.passed) {
          handleAdvanceOldCycle([newEvent.page]);
        }

        // Check if a milestone was hit (e.g. 10 approved pages, 20 approved pages, or 100%)
        if (effectiveSeed) {
          const prevProgress = computeProgress(effectiveSeed, prev, todayInRiyadh());
          const nextProgress = computeProgress(effectiveSeed, updated, todayInRiyadh());

          if (
            (prevProgress.approvedCount < 10 && nextProgress.approvedCount >= 10) ||
            (prevProgress.approvedCount < 20 && nextProgress.approvedCount >= 20) ||
            (prevProgress.approvedCount < 263 && nextProgress.approvedCount >= 263)
          ) {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#12372A', '#C59B27', '#E8DFCA', '#10B981'],
            });
          }
        }

        return updated;
      });
    },
    [settings.useDemoData, effectiveSeed, handleAdvanceOldCycle]
  );

  // Void a recitation
  const handleVoidRecitation = useCallback(
    (id: string) => {
      setEvents((prev) => {
        const updated = prev.filter((e) => e.id !== id);
        if (!settings.useDemoData) {
          saveStoredEvents(updated);
        }
        return updated;
      });
    },
    [settings.useDemoData]
  );

  // Save error item
  const handleSaveError = useCallback(
    (item: ErrorLogItem) => {
      setErrors((prev) => {
        const idx = prev.findIndex((e) => e.id === item.id);
        const updated = idx >= 0 ? prev.map((e) => (e.id === item.id ? item : e)) : [...prev, item];
        if (!settings.useDemoData) {
          saveStoredErrors(updated);
        }
        return updated;
      });
    },
    [settings.useDemoData]
  );

  // Delete error item
  const handleDeleteError = useCallback(
    (id: string) => {
      setErrors((prev) => {
        const updated = prev.filter((e) => e.id !== id);
        if (!settings.useDemoData) {
          saveStoredErrors(updated);
        }
        return updated;
      });
    },
    [settings.useDemoData]
  );

  // Update settings
  const handleUpdateSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  }, []);

  // Toggle demo mode
  const handleToggleDemoMode = useCallback(() => {
    const nextUseDemo = !settings.useDemoData;
    const nextSettings = { ...settings, useDemoData: nextUseDemo };
    setSettings(nextSettings);
    saveStoredSettings(nextSettings);

    if (nextUseDemo) {
      setEvents(loadDemoEvents());
      setErrors(loadDemoErrors());
      setOldCycle(loadStoredOldCycle());
      setCurrentDate('2026-11-07');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#C59B27', '#12372A'],
      });
    } else {
      setEvents(loadStoredEvents());
      setErrors(loadStoredErrors());
      setOldCycle(loadStoredOldCycle());
      setCurrentDate(todayInRiyadh());
    }
  }, [settings]);

  // Import seed file
  const handleImportSeed = useCallback((newSeed: QuranPlanSeed) => {
    setSeed(newSeed);
  }, []);

  // Restore backup
  const handleRestoreBackup = useCallback((backupText: string) => {
    const backup = importBackupJSON(backupText);
    if (!backup) return false;

    setEvents(backup.events || []);
    setErrors(backup.errors || []);
    setOldCycle(backup.oldCycle || {
      currentPointerPage: 1,
      completedPagesInCurrentCycle: [],
      cycleIteration: 1,
    });
    setSettings(backup.settings || {
      dailyAvailableMinutes: 120,
      reciterName: '',
      teacherName: '',
      useDemoData: false,
    });
    if (backup.customPlan) {
      setCustomPlan(backup.customPlan);
    }
    return true;
  }, []);

  // Reset all user data
  const handleResetAllData = useCallback(() => {
    clearAllProgressData();
    setEvents([]);
    setErrors([]);
    setOldCycle({
      currentPointerPage: 1,
      completedPagesInCurrentCycle: [],
      cycleIteration: 1,
    });
    setCustomPlan(null);
  }, []);

  // Reload bundled seed
  const handleReloadBundledSeed = useCallback(async () => {
    try {
      const resp = await fetch('/assets/aistudio/Quran_Plan_1448_1087cde1.json');
      if (resp.ok) {
        const data = await resp.json();
        setSeed(data);
      }
    } catch (e) {
      console.error('Failed to reload bundled seed:', e);
    }
  }, []);

  // Open recitation modal helper
  const openRecitationModal = useCallback(
    (page: number, type: RecitationType = 'new', defaultDate: string = currentDate) => {
      setRecitationModal({
        isOpen: true,
        page,
        type,
        defaultDate,
      });
    },
    [currentDate]
  );

  // Open error modal helper
  const openErrorModal = useCallback(
    (item?: ErrorLogItem | null, defaultPage?: number) => {
      setErrorModal({
        isOpen: true,
        initialError: item || null,
        defaultPage: defaultPage || item?.page || 342,
      });
    },
    []
  );

  // Loading state
  if (!seed || !effectiveSeed) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#12372A] flex items-center justify-center text-[#C59B27] font-serif font-black text-3xl shadow-xl animate-pulse mb-4">
          ث
        </div>
        <h1 className="font-serif text-xl font-bold text-[#12372A]">جاري تهيئة مصحف ثبات...</h1>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          يتم تحميل فهرس مجمع الملك فهد (604 صفحات، 6236 آية متحققة) وجدولة الحفظ والمراجعة
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#1F2937] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentDate={currentDate}
        isDemo={settings.useDemoData}
        onToggleDemo={handleToggleDemoMode}
        overdueCount={progressMetrics?.overduePages.length || 0}
        weakCount={progressMetrics?.weakPages.length || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'today' && (
          <TodayTab
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            seed={effectiveSeed}
            events={events}
            oldCycle={oldCycle}
            onOpenRecitation={(page, type) => openRecitationModal(page, type || 'new')}
            onAdvanceOldCycle={handleAdvanceOldCycle}
            dailyAvailableMinutes={settings.dailyAvailableMinutes}
          />
        )}

        {activeTab === 'plan' && (
          <PlanTab
            seed={seed}
            events={events}
            customPlan={customPlan}
            onApplyCustomPlan={(plan) => {
              setCustomPlan(plan);
              saveCustomPlan(plan);
            }}
            onSelectDate={(d) => {
              setCurrentDate(d);
              setActiveTab('today');
            }}
            onOpenRecitation={(page, type) => openRecitationModal(page, type || 'new')}
            dailyAvailableMinutes={settings.dailyAvailableMinutes}
          />
        )}

        {activeTab === 'review' && (
          <ReviewTab
            currentDate={currentDate}
            seed={effectiveSeed}
            events={events}
            oldCycle={oldCycle}
            onOpenRecitation={(page, type) => openRecitationModal(page, type || 'review')}
            onAdvanceOldCycle={handleAdvanceOldCycle}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTab
            currentDate={currentDate}
            seed={effectiveSeed}
            events={events}
            onSelectPage={(page) => setDetailModalPage(page)}
            dailyAvailableMinutes={settings.dailyAvailableMinutes}
          />
        )}

        {activeTab === 'more' && (
          <MoreTab
            seed={effectiveSeed}
            errors={errors}
            settings={settings}
            pageIndex={effectiveSeed.pageIndex}
            onSaveError={handleSaveError}
            onDeleteError={handleDeleteError}
            onOpenErrorModal={openErrorModal}
            onUpdateSettings={handleUpdateSettings}
            onImportSeed={handleImportSeed}
            onRestoreBackup={handleRestoreBackup}
            onResetAllData={handleResetAllData}
            onToggleDemoMode={handleToggleDemoMode}
            onReloadBundledSeed={handleReloadBundledSeed}
          />
        )}
      </main>

      {/* Recitation Recording Modal */}
      <RecitationModal
        isOpen={recitationModal.isOpen}
        onClose={() => setRecitationModal((prev) => ({ ...prev, isOpen: false }))}
        page={recitationModal.page}
        initialDate={recitationModal.defaultDate}
        defaultType={recitationModal.type}
        seed={effectiveSeed}
        onSave={handleRecordRecitation}
        onDelete={handleVoidRecitation}
      />

      {/* Page Inspection Detail Modal */}
      <PageDetailModal
        page={detailModalPage}
        onClose={() => setDetailModalPage(null)}
        seed={effectiveSeed}
        events={events}
        errors={errors}
        onOpenRecitation={(page, type) => openRecitationModal(page, type || 'review')}
      />

      {/* Error & Mutashabihat Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
        pageIndex={effectiveSeed.pageIndex}
        defaultPage={errorModal.defaultPage}
        initialError={errorModal.initialError}
        onSave={handleSaveError}
        onDelete={handleDeleteError}
      />

      {/* Plan Re-distribution Modal */}
      <RedistributeModal
        isOpen={redistributeModalOpen}
        onClose={() => setRedistributeModalOpen(false)}
        seed={seed}
        events={events}
        dailyAvailableMinutes={settings.dailyAvailableMinutes}
        onApply={(plan) => {
          setCustomPlan(plan);
          saveCustomPlan(plan);
        }}
      />
    </div>
  );
}
