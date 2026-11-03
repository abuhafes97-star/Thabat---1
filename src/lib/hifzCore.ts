/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuranPlanSeed, RecitationEvent } from '../types/quranPlan';

// Deterministic reference calculations. Dates are Gregorian date-only strings.
export const REVIEW_OFFSETS = [1, 3, 7, 14, 30];

export function utcDate(day: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`Invalid date format: ${day}`);
  const d = new Date(day + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== day) {
    throw new Error(`Invalid date value: ${day}`);
  }
  return d;
}

export function addDays(day: string, amount: number): string {
  const d = utcDate(day);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(first: string, last: string): number {
  return Math.round((utcDate(last).getTime() - utcDate(first).getTime()) / 86400000);
}

export function todayInRiyadh(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map(p => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function passed(event: RecitationEvent): boolean {
  return (
    event.passed === true &&
    event.withoutLooking === true &&
    event.prompts === 0 &&
    Number.isInteger(event.selfCorrections) &&
    event.selfCorrections >= 0 &&
    event.selfCorrections <= 1 &&
    event.repeatedError === false
  );
}

export interface HistoryResult {
  target: number[];
  byPage: Map<number, RecitationEvent[]>;
  learned: Map<number, string>; // page -> first successful new pass date
  approved: Map<number, string>; // page -> first successful review pass date on subsequent calendar day
  stable: Set<number>; // approved pages where the latest recitation is a pass
}

export function history(seed: QuranPlanSeed, events: RecitationEvent[], asOfDate: string): HistoryResult {
  utcDate(asOfDate);
  const byId = new Map<string, RecitationEvent>();
  for (const e of events) {
    if (!e.id || !Number.isInteger(e.page) || e.page < 1 || e.page > 604) {
      throw new Error(`Invalid event: page out of range or missing ID`);
    }
    utcDate(e.date);
    if (!['new', 'review', 'assessment', 'old', 'consolidation'].includes(e.type)) {
      throw new Error(`Invalid event type: ${e.type}`);
    }
    const prior = byId.get(e.id);
    if (prior && JSON.stringify(prior) !== JSON.stringify(e)) {
      throw new Error(`Conflicting event ID: ${e.id}`);
    }
    byId.set(e.id, e);
  }

  const ordered = [...byId.values()]
    .filter(e => !e.voided && e.date <= asOfDate)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        String(a.recordedAt ?? '').localeCompare(String(b.recordedAt ?? '')) ||
        a.id.localeCompare(b.id)
    );

  const byPage = new Map<number, RecitationEvent[]>();
  for (const e of ordered) {
    if (!byPage.has(e.page)) byPage.set(e.page, []);
    byPage.get(e.page)!.push(e);
  }

  const target = seed.profile.targetPages;
  const learned = new Map<number, string>();
  const approved = new Map<number, string>();
  const stable = new Set<number>();

  for (const p of target) {
    const list = byPage.get(p) ?? [];
    const first = list.find(e => e.type === 'new' && passed(e));
    if (!first) continue;
    learned.set(p, first.date);

    // Approval requires a successful recitation (not type 'new') on a SUBSEQUENT calendar day!
    const followUp = list.find(e => e.type !== 'new' && e.date > first.date && passed(e));
    if (followUp) {
      approved.set(p, followUp.date);
      const lastAttempt = list[list.length - 1];
      if (lastAttempt && passed(lastAttempt)) {
        stable.add(p);
      }
    }
  }

  return { target, byPage, learned, approved, stable };
}

export const percent = (n: number, d: number): number | null => {
  return d ? Math.round((n / d) * 10000) / 100 : null;
};

export interface ProgressResult {
  asOfDate: string;
  totalPages: number;
  learnedCount: number;
  approvedCount: number;
  stableCount: number;
  approvedPercent: number | null;
  learnedPercent: number | null;
  stabilityAmongApprovedPercent: number | null;
  expectedLearnedCount: number;
  expectedApprovedCount: number;
  netPages: number;
  overduePages: number[];
  aheadPages: number[];
  pendingPages: number[];
  weakPages: number[];
  oldestUnmetDate: string | null;
  contiguousApprovedCount: number;
  nextUnlearnedPage: number | null;
  onTrack: boolean;
  approvedPages: number[];
  learnedPages: number[];
}

export function computeProgress(seed: QuranPlanSeed, events: RecitationEvent[], asOfDate: string): ProgressResult {
  const h = history(seed, events, asOfDate);
  const plannedNew = new Map<number, string>(
    seed.plan.days.flatMap(d => d.newPages.map(p => [p, d.date] as [number, string]))
  );

  const expectedLearned = new Set<number>();
  const expectedApproved = new Set<number>();
  for (const [p, day] of plannedNew) {
    if (day <= asOfDate) expectedLearned.add(p);
    // For approved, add 1 day for fair comparison with delayed follow-up requirement
    if (addDays(day, 1) <= asOfDate) expectedApproved.add(p);
  }

  const overduePages = [...expectedApproved].filter(p => !h.approved.has(p)).sort((a, b) => a - b);
  const aheadPages = [...h.approved.keys()].filter(p => !expectedApproved.has(p)).sort((a, b) => a - b);
  const pendingPages = [...h.learned.keys()].filter(p => !h.approved.has(p)).sort((a, b) => a - b);
  const weakPages = [...h.approved.keys()].filter(p => !h.stable.has(p)).sort((a, b) => a - b);

  const firstMissing = h.target.find(p => !h.approved.has(p));
  const oldestUnmetDate = overduePages.length
    ? overduePages.map(p => addDays(plannedNew.get(p)!, 1)).sort()[0]
    : null;

  return {
    asOfDate,
    totalPages: h.target.length,
    learnedCount: h.learned.size,
    approvedCount: h.approved.size,
    stableCount: h.stable.size,
    approvedPercent: percent(h.approved.size, h.target.length),
    learnedPercent: percent(h.learned.size, h.target.length),
    stabilityAmongApprovedPercent: percent(h.stable.size, h.approved.size),
    expectedLearnedCount: expectedLearned.size,
    expectedApprovedCount: expectedApproved.size,
    netPages: h.approved.size - expectedApproved.size,
    overduePages,
    aheadPages,
    pendingPages,
    weakPages,
    oldestUnmetDate,
    contiguousApprovedCount: firstMissing === undefined ? h.target.length : h.target.indexOf(firstMissing),
    nextUnlearnedPage: h.target.find(p => !h.learned.has(p)) ?? null,
    onTrack: overduePages.length === 0 && weakPages.length === 0,
    approvedPages: [...h.approved.keys()].sort((a, b) => a - b),
    learnedPages: [...h.learned.keys()].sort((a, b) => a - b),
  };
}

export interface ReviewObligation {
  id: string;
  page: number;
  dueDate: string;
  reason: string;
}

export interface ReviewTask {
  page: number;
  earliestDueDate: string;
  reasons: string[];
  obligationIds: string[];
  overdue: boolean;
  ageDays: number;
}

export interface ReviewRecord {
  page: number;
  dueDate: string;
  reasons: string[];
  ids: string[];
  completedDate: string | null;
  onTime: boolean;
}

export interface ReviewsResult {
  tasks: ReviewTask[];
  uniquePagesToday: number;
  dueUnits: number;
  completedUnits: number;
  onTimeUnits: number;
  completionPercent: number | null;
  onTimePercent: number | null;
  records: ReviewRecord[];
}

export function computeReviews(
  seed: QuranPlanSeed,
  events: RecitationEvent[],
  asOfDate: string,
  extras: ReviewObligation[] = []
): ReviewsResult {
  const h = history(seed, events, asOfDate);
  const obligations: ReviewObligation[] = [];

  for (const [page, actualDay] of h.learned) {
    for (const offset of REVIEW_OFFSETS) {
      const dueDate = addDays(actualDay, offset);
      obligations.push({
        id: `spaced:${page}:${actualDay}:${offset}`,
        page,
        dueDate,
        reason: `D${offset}`,
      });
    }
  }

  obligations.push(...extras);

  const groups = new Map<string, { page: number; dueDate: string; reasons: string[]; ids: string[] }>();
  for (const o of obligations) {
    utcDate(o.dueDate);
    if (o.dueDate > asOfDate) continue;
    const key = `${o.page}|${o.dueDate}`;
    if (!groups.has(key)) {
      groups.set(key, { page: o.page, dueDate: o.dueDate, reasons: [], ids: [] });
    }
    const g = groups.get(key)!;
    if (!g.reasons.includes(o.reason)) g.reasons.push(o.reason);
    if (!g.ids.includes(o.id)) g.ids.push(o.id);
  }

  const records: ReviewRecord[] = [...groups.values()].map(g => {
    const list = h.byPage.get(g.page) ?? [];
    const done = list.find(e => e.type !== 'new' && e.date >= g.dueDate && passed(e));
    return {
      ...g,
      completedDate: done?.date ?? null,
      onTime: done?.date === g.dueDate,
    };
  });

  const queue = new Map<number, { page: number; earliestDueDate: string; reasons: string[]; obligationIds: string[] }>();
  for (const o of records.filter(r => !r.completedDate)) {
    if (!queue.has(o.page)) {
      queue.set(o.page, {
        page: o.page,
        earliestDueDate: o.dueDate,
        reasons: [],
        obligationIds: [],
      });
    }
    const item = queue.get(o.page)!;
    if (o.dueDate < item.earliestDueDate) item.earliestDueDate = o.dueDate;
    item.reasons = [...new Set([...item.reasons, ...o.reasons])];
    item.obligationIds = [...new Set([...item.obligationIds, ...o.ids])];
  }

  const tasks: ReviewTask[] = [...queue.values()]
    .map(t => ({
      ...t,
      overdue: t.earliestDueDate < asOfDate,
      ageDays: daysBetween(t.earliestDueDate, asOfDate),
    }))
    .sort((a, b) => a.earliestDueDate.localeCompare(b.earliestDueDate) || a.page - b.page);

  const completedUnits = records.filter(r => r.completedDate).length;
  const onTimeUnits = records.filter(r => r.onTime).length;

  return {
    tasks,
    uniquePagesToday: tasks.length,
    dueUnits: records.length,
    completedUnits,
    onTimeUnits,
    completionPercent: percent(completedUnits, records.length),
    onTimePercent: percent(onTimeUnits, records.length),
    records,
  };
}

/**
 * Validates a QuranPlanSeed JSON according to strict acceptance rules:
 * - schemaVersion present
 * - 604 unique pages in pageIndex
 * - 6236 unique ayahKeys
 * - exact 263 target pages
 * - max 4 new pages per day
 * - total 70 new days
 */
export function validateSeed(data: unknown): { valid: boolean; error?: string; seed?: QuranPlanSeed } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'الملف ليس كائن JSON صالحًا' };
  }
  const s = data as Partial<QuranPlanSeed>;
  if (!s.schemaVersion) {
    return { valid: false, error: 'حقل schemaVersion مفقود في الملف' };
  }
  if (!Array.isArray(s.pageIndex) || s.pageIndex.length !== 604) {
    return { valid: false, error: `عدد صفحات المصحف في الفهرس يجب أن يكون 604، وُجد: ${s.pageIndex?.length ?? 0}` };
  }

  // Check 604 unique pages
  const pageSet = new Set(s.pageIndex.map(p => p.page));
  if (pageSet.size !== 604) {
    return { valid: false, error: `يوجد تكرار في أرقام صفحات المصحف: ${pageSet.size} صفحة فريدة فقط` };
  }

  // Check ayahKeys count
  const allAyahs = new Set<string>();
  for (const p of s.pageIndex) {
    if (Array.isArray(p.ayahKeys)) {
      for (const a of p.ayahKeys) allAyahs.add(a);
    }
  }
  if (allAyahs.size !== 6236) {
    return { valid: false, error: `عدد مفاتيح الآيات الفريدة يجب أن يكون 6236، وُجد: ${allAyahs.size}` };
  }

  if (!s.profile || !Array.isArray(s.profile.targetPages) || s.profile.targetPages.length !== 263) {
    return { valid: false, error: `عدد صفحات الهدف يجب أن يكون 263، وُجد: ${s.profile?.targetPages?.length ?? 0}` };
  }

  if (!s.plan || !Array.isArray(s.plan.days)) {
    return { valid: false, error: 'جدول الأيام في الخطة مفقود' };
  }

  const newDays = s.plan.days.filter(d => d.type === 'new');
  if (newDays.length !== 70) {
    return { valid: false, error: `عدد أيام الحفظ الجديد يجب أن يكون 70 يومًا، وُجد: ${newDays.length}` };
  }

  for (const d of newDays) {
    if (d.newPages.length > 4) {
      return { valid: false, error: `اليوم ${d.date} يتجاوز سقف 4 أوجه يوميًا (${d.newPages.length} أوجه)` };
    }
  }

  return { valid: true, seed: data as QuranPlanSeed };
}

/**
 * Gets textual description of the Quranic content for a given page
 */
export function getPageContentSummary(page: number, seed: QuranPlanSeed): string {
  const p = seed.pageIndex.find(item => item.page === page);
  if (!p || !p.segments || p.segments.length === 0) return `صفحة ${page}`;
  return p.segments
    .map(seg => `سورة ${seg.surahName} (${seg.fromAyah}–${seg.toAyah})`)
    .join('؛ ');
}

/**
 * Returns eligible pages for the Old Cycle (starts 1..341,
 * and newly learned pages join when they pass their D+30 review).
 */
export function getEligibleOldCyclePages(seed: QuranPlanSeed, events: RecitationEvent[], asOfDate: string): number[] {
  const basePages = seed.profile.legacyPages || Array.from({ length: 341 }, (_, i) => i + 1);
  const eligible = new Set<number>(basePages);

  const h = history(seed, events, asOfDate);
  for (const [page, actualDay] of h.learned) {
    const d30DueDate = addDays(actualDay, 30);
    if (d30DueDate <= asOfDate) {
      const list = h.byPage.get(page) ?? [];
      const passedD30 = list.some(e => e.type !== 'new' && e.date >= d30DueDate && passed(e));
      if (passedD30) {
        eligible.add(page);
      }
    }
  }

  return Array.from(eligible).sort((a, b) => a - b);
}

/**
 * Hijri date formatter approximation for display (Umm al-Qura standard)
 */
export function getHijriDisplay(dateStr: string): string {
  try {
    const d = utcDate(dateStr);
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(d);
  } catch {
    return '';
  }
}
