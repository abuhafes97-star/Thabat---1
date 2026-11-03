/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  QuranPlanSeed,
  RecitationEvent,
  ErrorLogItem,
  OldCycleState,
  UserSettings,
  PlanRoot,
  BackupData,
} from '../types/quranPlan';
import { validateSeed } from './hifzCore';

const STORAGE_KEYS = {
  SEED: 'thabat_seed_data_v1',
  EVENTS: 'thabat_events_v1',
  ERRORS: 'thabat_errors_v1',
  OLD_CYCLE: 'thabat_old_cycle_v1',
  SETTINGS: 'thabat_settings_v1',
  CUSTOM_PLAN: 'thabat_custom_plan_v1',
  IS_DEMO: 'thabat_is_demo_v1',
  DEMO_EVENTS: 'thabat_demo_events_v1',
  DEMO_ERRORS: 'thabat_demo_errors_v1',
  DEMO_OLD_CYCLE: 'thabat_demo_old_cycle_v1',
};

export const DEFAULT_SETTINGS: UserSettings = {
  dailyAvailableMinutes: 120,
  reciterName: '',
  teacherName: '',
  useDemoData: false,
};

export const DEFAULT_OLD_CYCLE: OldCycleState = {
  currentPointerPage: 1,
  completedPagesInCurrentCycle: [],
  cycleIteration: 1,
};

// Safe LocalStorage helpers
function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

import bundledSeedRaw from '../../public/assets/aistudio/Quran_Plan_1448_1087cde1.json';

export async function fetchBundledSeed(): Promise<QuranPlanSeed | null> {
  // First try the compiled bundled asset
  try {
    const val = validateSeed(bundledSeedRaw);
    if (val.valid && val.seed) {
      return val.seed;
    }
  } catch (e) {
    console.warn('Failed to parse static bundled seed:', e);
  }

  // Fallback to fetch
  for (const url of ['/assets/aistudio/Quran_Plan_1448_1087cde1.json', '/public/assets/aistudio/Quran_Plan_1448_1087cde1.json']) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const val = validateSeed(json);
        if (val.valid && val.seed) {
          return val.seed;
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

export function loadSeed(): QuranPlanSeed | null {
  const cached = safeGet<QuranPlanSeed | null>(STORAGE_KEYS.SEED, null);
  if (cached) {
    const val = validateSeed(cached);
    if (val.valid) return cached;
  }
  return null;
}

export function saveSeed(seed: QuranPlanSeed): void {
  safeSet(STORAGE_KEYS.SEED, seed);
}

export function isDemoMode(): boolean {
  return safeGet<boolean>(STORAGE_KEYS.IS_DEMO, false);
}

export function setDemoMode(active: boolean): void {
  safeSet(STORAGE_KEYS.IS_DEMO, active);
}

export function loadEvents(): RecitationEvent[] {
  const demo = isDemoMode();
  return safeGet<RecitationEvent[]>(demo ? STORAGE_KEYS.DEMO_EVENTS : STORAGE_KEYS.EVENTS, []);
}

export function saveEvents(events: RecitationEvent[]): void {
  const demo = isDemoMode();
  safeSet(demo ? STORAGE_KEYS.DEMO_EVENTS : STORAGE_KEYS.EVENTS, events);
}

export function addOrUpdateEvent(event: RecitationEvent): void {
  const events = loadEvents();
  const index = events.findIndex(e => e.id === event.id);
  if (index >= 0) {
    events[index] = event;
  } else {
    events.push(event);
  }
  saveEvents(events);
}

export function deleteEvent(eventId: string): void {
  const events = loadEvents().filter(e => e.id !== eventId);
  saveEvents(events);
}

export function loadErrors(): ErrorLogItem[] {
  const demo = isDemoMode();
  return safeGet<ErrorLogItem[]>(demo ? STORAGE_KEYS.DEMO_ERRORS : STORAGE_KEYS.ERRORS, []);
}

export function saveErrors(errors: ErrorLogItem[]): void {
  const demo = isDemoMode();
  safeSet(demo ? STORAGE_KEYS.DEMO_ERRORS : STORAGE_KEYS.ERRORS, errors);
}

export function addOrUpdateError(item: ErrorLogItem): void {
  const list = loadErrors();
  const index = list.findIndex(e => e.id === item.id);
  if (index >= 0) {
    list[index] = item;
  } else {
    list.push(item);
  }
  saveErrors(list);
}

export function deleteError(errorId: string): void {
  const list = loadErrors().filter(e => e.id !== errorId);
  saveErrors(list);
}

export function loadOldCycle(): OldCycleState {
  const demo = isDemoMode();
  return safeGet<OldCycleState>(demo ? STORAGE_KEYS.DEMO_OLD_CYCLE : STORAGE_KEYS.OLD_CYCLE, DEFAULT_OLD_CYCLE);
}

export function saveOldCycle(state: OldCycleState): void {
  const demo = isDemoMode();
  safeSet(demo ? STORAGE_KEYS.DEMO_OLD_CYCLE : STORAGE_KEYS.OLD_CYCLE, state);
}

export function loadSettings(): UserSettings {
  const s = safeGet<UserSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return { ...s, useDemoData: isDemoMode() };
}

export function saveSettings(settings: UserSettings): void {
  safeSet(STORAGE_KEYS.SETTINGS, settings);
  setDemoMode(settings.useDemoData);
}

export function loadCustomPlan(): PlanRoot | null {
  return safeGet<PlanRoot | null>(STORAGE_KEYS.CUSTOM_PLAN, null);
}

export function saveCustomPlan(plan: PlanRoot | null): void {
  safeSet(STORAGE_KEYS.CUSTOM_PLAN, plan);
}

export function exportFullBackup(): BackupData {
  const seed = loadSeed();
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    seedVersion: seed?.schemaVersion,
    events: loadEvents(),
    errors: loadErrors(),
    oldCycle: loadOldCycle(),
    settings: loadSettings(),
    customPlan: loadCustomPlan() || undefined,
  };
}

export function restoreBackup(backup: BackupData): { success: boolean; message: string } {
  try {
    if (!backup || typeof backup !== 'object') {
      return { success: false, message: 'ملف النسخة الاحتياطية غير صالح' };
    }
    if (Array.isArray(backup.events)) {
      saveEvents(backup.events);
    }
    if (Array.isArray(backup.errors)) {
      saveErrors(backup.errors);
    }
    if (backup.oldCycle) {
      saveOldCycle(backup.oldCycle);
    }
    if (backup.settings) {
      saveSettings(backup.settings);
    }
    if (backup.customPlan) {
      saveCustomPlan(backup.customPlan);
    }
    return { success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `فشل استعادة النسخة: ${errorMsg}` };
  }
}

/**
 * Creates sample realistic demo data (2 weeks into plan)
 * for testing UI states without affecting real logs.
 */
export function populateDemoData(): void {
  const demoEvents: RecitationEvent[] = [];
  // Day 1 (Nov 4): pages 342, 343, 344
  [342, 343, 344].forEach((page, i) => {
    demoEvents.push({
      id: `demo-new-${page}`,
      page,
      date: '2026-11-04',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: i === 1 ? 1 : 0,
      repeatedError: false,
      timeMinutes: 20,
    });
    // Follow-up on Nov 5
    demoEvents.push({
      id: `demo-rev-d1-${page}`,
      page,
      date: '2026-11-05',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
      timeMinutes: 3,
    });
  });

  // Day 2 (Nov 5): pages 345, 346, 347, 348
  [345, 346, 347, 348].forEach(page => {
    demoEvents.push({
      id: `demo-new-${page}`,
      page,
      date: '2026-11-05',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
      timeMinutes: 22,
    });
    // Follow up on Nov 6
    demoEvents.push({
      id: `demo-rev-d1-${page}`,
      page,
      date: '2026-11-06',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
      timeMinutes: 2,
    });
  });

  // Day 3 (Nov 6): pages 349, 350, 351 (351 has a struggle -> weak)
  [349, 350].forEach(page => {
    demoEvents.push({
      id: `demo-new-${page}`,
      page,
      date: '2026-11-06',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
      timeMinutes: 18,
    });
    demoEvents.push({
      id: `demo-rev-d1-${page}`,
      page,
      date: '2026-11-07',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
      timeMinutes: 2,
    });
  });

  // Page 351: passed new, but failed follow-up
  demoEvents.push({
    id: `demo-new-351`,
    page: 351,
    date: '2026-11-06',
    type: 'new',
    passed: true,
    withoutLooking: true,
    prompts: 0,
    selfCorrections: 1,
    repeatedError: false,
    timeMinutes: 25,
  });
  demoEvents.push({
    id: `demo-rev-d1-351`,
    page: 351,
    date: '2026-11-07',
    type: 'review',
    passed: false, // failed review -> needs consolidation
    withoutLooking: true,
    prompts: 2,
    selfCorrections: 1,
    repeatedError: true,
    timeMinutes: 10,
    notes: 'تعثر في الآيات الأخيرة من سورة المؤمنون',
  });

  safeSet(STORAGE_KEYS.DEMO_EVENTS, demoEvents);

  const demoErrors: ErrorLogItem[] = [
    {
      id: 'demo-err-1',
      date: '2026-11-06',
      page: 351,
      surahNumber: 23,
      surahName: 'المؤمنون',
      ayahNumber: 115,
      errorType: 'word',
      contextSnippet: 'أَفَحَسِبْتُمْ أَنَّمَا خَلَقْنَاكُمْ عَبَثًا',
      correctionFromMushaf: '«أَفَحَسِبْتُمْ أَنَّمَا خَلَقْنَاكُمْ عَبَثًا وَأَنَّكُمْ إِلَيْنَا لَا تُرْجَعُونَ»',
      severity: 'medium',
      retestDate: '2026-11-08',
      resolved: false,
      notes: 'التباس في خواتيم الآيات 115 و 116',
    },
  ];
  safeSet(STORAGE_KEYS.DEMO_ERRORS, demoErrors);

  safeSet(STORAGE_KEYS.DEMO_OLD_CYCLE, {
    currentPointerPage: 46,
    completedPagesInCurrentCycle: Array.from({ length: 45 }, (_, i) => i + 1),
    cycleIteration: 1,
    lastRecitationDate: '2026-11-06',
  });
}

// Aliases and convenience functions for App and MoreTab
export async function loadStoredSeed(): Promise<QuranPlanSeed | null> {
  const cached = loadSeed();
  if (cached) return cached;
  const bundled = await fetchBundledSeed();
  if (bundled) {
    saveSeed(bundled);
    return bundled;
  }
  return null;
}

export const loadStoredEvents = loadEvents;
export const saveStoredEvents = saveEvents;
export const loadStoredErrors = loadErrors;
export const saveStoredErrors = saveErrors;
export const loadStoredOldCycle = loadOldCycle;
export const saveStoredOldCycle = saveOldCycle;
export const loadStoredSettings = loadSettings;
export const saveStoredSettings = saveSettings;

export function loadDemoEvents(): RecitationEvent[] {
  populateDemoData();
  return safeGet<RecitationEvent[]>(STORAGE_KEYS.DEMO_EVENTS, []);
}

export function loadDemoErrors(): ErrorLogItem[] {
  populateDemoData();
  return safeGet<ErrorLogItem[]>(STORAGE_KEYS.DEMO_ERRORS, []);
}

export function clearAllProgressData(): void {
  safeSet(STORAGE_KEYS.EVENTS, []);
  safeSet(STORAGE_KEYS.ERRORS, []);
  safeSet(STORAGE_KEYS.OLD_CYCLE, DEFAULT_OLD_CYCLE);
  safeSet(STORAGE_KEYS.CUSTOM_PLAN, null);
}

export function exportBackupJSON(): void {
  const backup = exportFullBackup();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `thabat_quran_backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importBackupJSON(jsonString: string): BackupData | null {
  try {
    const parsed = JSON.parse(jsonString) as BackupData;
    const res = restoreBackup(parsed);
    if (res.success) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse backup JSON:', err);
  }
  return null;
}

