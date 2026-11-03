export interface QuranSegment {
  surah: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
}

export interface QuranPageIndexItem {
  page: number;
  segments: QuranSegment[];
  ayahKeys: string[];
}

export interface PlanProfile {
  appName: string;
  locale: string;
  timeZone: string;
  startDate: string;
  ramadanHijriYear: number;
  expectedRamadanDate: string;
  ramadanDateIsProvisional: boolean;
  shaabanStartDate: string;
  plannedLastNewDate: string;
  plannedLastInitialApprovalDate: string;
  latestNewDateBeforeConsolidation: string;
  consolidationStartDate: string;
  consolidationEndDate: string;
  targetPages: number[];
  targetSurahs: number[];
  direction: string;
  withinSurahOrder: string;
  legacyPages: number[];
  legacyLevel: string;
  reportedDailyAvailableMinutes: number;
  suggestedDailyPlanningMinutes: number;
  maxNewPagesPerDay: number;
  oldCyclePagesPerDay: number;
  minutesPerNewPage: number;
  minutesPerReviewPage: number;
  dailyErrorLogMinutes: number;
  reviewOffsets: number[];
  newStartProgressPages: number;
}

export interface PlanWeek {
  week: number;
  startDate: string;
  endDate: string;
  newPages: number;
  fromPage: number;
  toPage: number;
  dailyNewPageCounts: number[];
  from: QuranSegment;
  to: QuranSegment;
}

export type DayType = 'new' | 'review' | 'flex' | 'consolidation';

export interface PlanDay {
  date: string;
  weekdayAr: string;
  week: number;
  type: DayType;
  newPages: number[];
  plannedNearPagesForReference: number[];
  oldCyclePagesTarget: number;
  consolidationPages: number[];
  estimatedMinutes: number;
  plannedOldPagesForFirst14Reference?: number[];
}

export interface PlanRoot {
  id: string;
  immutableBaseline: boolean;
  totalTargetPages: number;
  newDays: number;
  reviewOnlyDaysBeforeConsolidation: number;
  flexDates: string[];
  weeks: PlanWeek[];
  days: PlanDay[];
}

export interface QuranPlanSeed {
  schemaVersion: string;
  documentType: string;
  createdOn: string;
  containsActualProgress: boolean;
  source: {
    publisher: string;
    edition: string;
    dataset: string;
    documentationUrl: string;
    archiveUrl: string;
    archiveSha256: string;
    verifiedAyahCount: number;
    verifiedPageCount: number;
    calendarSource: string;
  };
  pageIndex: QuranPageIndexItem[];
  profile: PlanProfile;
  plan: PlanRoot;
  initialState: {
    events: RecitationEvent[];
    errors: ErrorLogItem[];
    sessions: unknown[];
    oldCycleSuccessfulPages: number[];
    notes: string;
  };
  importRules: Record<string, boolean>;
  acceptanceChecks: Record<string, unknown>;
}

export type RecitationType = 'new' | 'review' | 'assessment' | 'old' | 'consolidation';

export interface RecitationEvent {
  id: string;
  page: number;
  date: string; // YYYY-MM-DD
  type: RecitationType;
  passed: boolean;
  withoutLooking: boolean;
  prompts: number;
  selfCorrections: number;
  repeatedError: boolean;
  timeMinutes?: number;
  reciterTeacher?: string;
  notes?: string;
  recordedAt?: string; // ISO string
  voided?: boolean;
}

export type ErrorType = 'word' | 'order' | 'transition' | 'verse_end' | 'harakah' | 'other';

export interface ErrorLogItem {
  id: string;
  date: string;
  page: number;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  errorType: ErrorType;
  contextSnippet: string;
  correctionFromMushaf: string;
  severity: 'high' | 'medium' | 'low';
  retestDate: string;
  resolved: boolean;
  resolvedDate?: string;
  notes?: string;
}

export interface OldCycleState {
  currentPointerPage: number; // e.g. 1
  completedPagesInCurrentCycle: number[];
  cycleIteration: number;
  lastRecitationDate?: string;
}

export interface UserSettings {
  dailyAvailableMinutes: number; // default 120
  reciterName: string;
  teacherName: string;
  useDemoData: boolean;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  seedVersion?: string;
  events: RecitationEvent[];
  errors: ErrorLogItem[];
  oldCycle: OldCycleState;
  settings: UserSettings;
  customPlan?: PlanRoot;
}
