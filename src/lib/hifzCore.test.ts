/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  todayInRiyadh,
  addDays,
  daysBetween,
  passed,
  computeProgress,
  computeReviews,
  validateSeed,
  getEligibleOldCyclePages,
} from './hifzCore';
import { QuranPlanSeed, RecitationEvent } from '../types/quranPlan';

// Load seed JSON
const seedPath = join(process.cwd(), 'public/assets/aistudio/Quran_Plan_1448_1087cde1.json');
const rawSeed = JSON.parse(readFileSync(seedPath, 'utf8')) as QuranPlanSeed;

test('Validation: Validates seed dataset structure and integrity', () => {
  const result = validateSeed(rawSeed);
  assert.equal(result.valid, true);
  assert.ok(result.seed);
  assert.equal(rawSeed.pageIndex.length, 604);
  assert.equal(rawSeed.profile.targetPages.length, 263);
  assert.equal(rawSeed.plan.newDays, 70);
  assert.equal(rawSeed.profile.plannedLastNewDate, '2027-01-24');
});

test('Acceptance Check 1 & 2: Target pages 263, page 604 Surahs, Day 1 coverage', () => {
  assert.equal(rawSeed.profile.targetPages[0], 342);
  assert.equal(rawSeed.profile.targetPages[rawSeed.profile.targetPages.length - 1], 604);
  assert.equal(rawSeed.profile.targetPages.length, 263);

  // Day 1 has pages 342, 343, 344
  const day1 = rawSeed.plan.days.find(d => d.date === '2026-11-04');
  assert.ok(day1);
  assert.deepEqual(day1?.newPages, [342, 343, 344]);

  // Page 604 has Ikhlas (112), Falaq (113), Nas (114)
  const page604 = rawSeed.pageIndex.find(p => p.page === 604);
  assert.ok(page604);
  const surahs = page604?.segments.map(s => s.surah);
  assert.deepEqual(surahs, [112, 113, 114]);
});

test('Acceptance Check 3: Empty events = 0% progress and 0 review tasks', () => {
  const progress = computeProgress(rawSeed, [], '2026-11-10');
  assert.equal(progress.learnedCount, 0);
  assert.equal(progress.approvedCount, 0);
  assert.equal(progress.approvedPercent, 0);

  const reviews = computeReviews(rawSeed, [], '2026-11-10');
  assert.equal(reviews.tasks.length, 0);
  assert.equal(reviews.dueUnits, 0);
});

test('Acceptance Check 4: Approved percentage precision and idempotent duplicate events', () => {
  // 10 approved pages should give 3.80% (10 / 263 = 0.0380228... -> 3.8%)
  const events: RecitationEvent[] = [];
  for (let p = 342; p < 352; p++) {
    events.push({
      id: `ev-new-${p}`,
      page: p,
      date: '2026-11-04',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    });
    // Follow-up on a subsequent day
    events.push({
      id: `ev-rev-${p}`,
      page: p,
      date: '2026-11-05',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    });
  }

  const prog10 = computeProgress(rawSeed, events, '2026-11-05');
  assert.equal(prog10.approvedCount, 10);
  assert.equal(prog10.approvedPercent, 3.8);

  // Duplicating the same events by ID should be idempotent
  const duplicated = [...events, ...events];
  const progDup = computeProgress(rawSeed, duplicated, '2026-11-05');
  assert.equal(progDup.approvedCount, 10);
  assert.equal(progDup.approvedPercent, 3.8);

  // 20 approved pages should give 7.60% (20 / 263 = 0.076045... -> 7.6%)
  for (let p = 352; p < 362; p++) {
    events.push({
      id: `ev-new-${p}`,
      page: p,
      date: '2026-11-06',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    });
    events.push({
      id: `ev-rev-${p}`,
      page: p,
      date: '2026-11-07',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    });
  }

  const prog20 = computeProgress(rawSeed, events, '2026-11-07');
  assert.equal(prog20.approvedCount, 20);
  assert.equal(prog20.approvedPercent, 7.6);
});

test('Acceptance Check 5: Same-day review does NOT approve; subsequent calendar day review approves', () => {
  const events: RecitationEvent[] = [
    {
      id: 'e1',
      page: 342,
      date: '2026-11-04',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
    {
      id: 'e2',
      page: 342,
      date: '2026-11-04', // same day!
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
  ];

  const progSameDay = computeProgress(rawSeed, events, '2026-11-04');
  assert.equal(progSameDay.learnedCount, 1);
  assert.equal(progSameDay.approvedCount, 0); // Not approved yet!
  assert.deepEqual(progSameDay.pendingPages, [342]);

  // Now add follow-up on next calendar day 2026-11-05
  events.push({
    id: 'e3',
    page: 342,
    date: '2026-11-05',
    type: 'review',
    passed: true,
    withoutLooking: true,
    prompts: 0,
    selfCorrections: 0,
    repeatedError: false,
  });

  const progNextDay = computeProgress(rawSeed, events, '2026-11-05');
  assert.equal(progNextDay.approvedCount, 1);
  assert.deepEqual(progNextDay.pendingPages, []);
});

test('Acceptance Check 6 & 7: Spaced review generation from actual pass date and collapse of same-day reasons', () => {
  // Memorized page 342 on 2026-11-06 (instead of planned 2026-11-04)
  const events: RecitationEvent[] = [
    {
      id: 'actual-pass',
      page: 342,
      date: '2026-11-06',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
  ];

  // On 2026-11-06, D+1 is not due yet
  const revDay6 = computeReviews(rawSeed, events, '2026-11-06');
  assert.equal(revDay6.tasks.length, 0);

  // On 2026-11-07, D+1 is due!
  const revDay7 = computeReviews(rawSeed, events, '2026-11-07');
  assert.equal(revDay7.tasks.length, 1);
  assert.equal(revDay7.tasks[0].page, 342);
  assert.equal(revDay7.tasks[0].earliestDueDate, '2026-11-07');
  assert.deepEqual(revDay7.tasks[0].reasons, ['D1']);

  // Adding an extra reason (e.g. weekly test on the same day) collapses into ONE task for page 342
  const revDay7WithExtra = computeReviews(rawSeed, events, '2026-11-07', [
    { id: 'weekly-342', page: 342, dueDate: '2026-11-07', reason: 'أسبوعي' },
  ]);
  assert.equal(revDay7WithExtra.tasks.length, 1);
  assert.deepEqual(revDay7WithExtra.tasks[0].reasons, ['D1', 'أسبوعي']);
});

test('Acceptance Check 8: Early review does not clear future obligation; late review is not on-time', () => {
  const events: RecitationEvent[] = [
    {
      id: 'e-new',
      page: 342,
      date: '2026-11-04',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
    // D+1 is due 2026-11-05, D+3 is due 2026-11-07
    // Review passed on 2026-11-05
    {
      id: 'e-rev-5',
      page: 342,
      date: '2026-11-05',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
  ];

  // On 2026-11-05, D+1 is completed on-time
  const rev5 = computeReviews(rawSeed, events, '2026-11-05');
  assert.equal(rev5.tasks.length, 0);
  assert.equal(rev5.onTimeUnits, 1);

  // An early review on 2026-11-06 does NOT clear D+3 which is due on 2026-11-07!
  events.push({
    id: 'e-early-6',
    page: 342,
    date: '2026-11-06',
    type: 'review',
    passed: true,
    withoutLooking: true,
    prompts: 0,
    selfCorrections: 0,
    repeatedError: false,
  });

  const rev7 = computeReviews(rawSeed, events, '2026-11-07');
  // D+3 is due on 2026-11-07 and was not satisfied by the 2026-11-06 recitation!
  assert.equal(rev7.tasks.length, 1);
  assert.equal(rev7.tasks[0].page, 342);
  assert.deepEqual(rev7.tasks[0].reasons, ['D3']);

  // If satisfied on 2026-11-08 (late), it is marked completed but NOT onTime
  events.push({
    id: 'e-late-8',
    page: 342,
    date: '2026-11-08',
    type: 'review',
    passed: true,
    withoutLooking: true,
    prompts: 0,
    selfCorrections: 0,
    repeatedError: false,
  });

  const rev8 = computeReviews(rawSeed, events, '2026-11-08');
  assert.equal(rev8.tasks.length, 0); // No remaining due tasks
  // D1 was on-time, D3 was late
  assert.equal(rev8.completedUnits, 2);
  assert.equal(rev8.onTimeUnits, 1);
});

test('Acceptance Check 9: Failure after approval preserves learned & approved, but lowers stability and lists as weak', () => {
  const events: RecitationEvent[] = [
    {
      id: 'e1',
      page: 342,
      date: '2026-11-04',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
    {
      id: 'e2',
      page: 342,
      date: '2026-11-05',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
  ];

  const beforeFail = computeProgress(rawSeed, events, '2026-11-05');
  assert.equal(beforeFail.approvedCount, 1);
  assert.equal(beforeFail.stableCount, 1);
  assert.equal(beforeFail.weakPages.length, 0);

  // Recitation fails on 2026-11-07 (e.g. with prompts = 2)
  events.push({
    id: 'e3-fail',
    page: 342,
    date: '2026-11-07',
    type: 'review',
    passed: false,
    withoutLooking: true,
    prompts: 2,
    selfCorrections: 0,
    repeatedError: false,
  });

  const afterFail = computeProgress(rawSeed, events, '2026-11-07');
  assert.equal(afterFail.approvedCount, 1); // Kept!
  assert.equal(afterFail.stableCount, 0); // Lost stability
  assert.deepEqual(afterFail.weakPages, [342]); // Added to weak pages
});

test('Acceptance Check 10 & 11: Early gap does not hide overdue, and date constraints hold', () => {
  // Memorized page 345 (planned for day 2) but skipped pages 342, 343, 344 (planned for day 1)
  const events: RecitationEvent[] = [
    {
      id: 'ev-new-345',
      page: 345,
      date: '2026-11-05',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
    {
      id: 'ev-rev-345',
      page: 345,
      date: '2026-11-06',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
  ];

  // On 2026-11-05, day 1 pages (342..344) are expectedApproved
  const prog = computeProgress(rawSeed, events, '2026-11-05');
  assert.deepEqual(prog.overduePages, [342, 343, 344]);
  assert.deepEqual(prog.aheadPages, []);
  assert.equal(prog.contiguousApprovedCount, 0); // 0 because page 342 is missing!

  // Before start date (2026-11-03)
  const progPre = computeProgress(rawSeed, [], '2026-11-03');
  assert.equal(progPre.overduePages.length, 0);
  assert.equal(progPre.onTrack, true);
});

test('Acceptance Check 12: Riyadh timezone test for 2026-11-03T21:30:00Z', () => {
  // 21:30 UTC is +3h in Asia/Riyadh -> 00:30 on 2026-11-04
  const testDate = new Date('2026-11-03T21:30:00Z');
  const riyadhDay = todayInRiyadh(testDate);
  assert.equal(riyadhDay, '2026-11-04');
});

test('Acceptance Check 13: Old cycle page eligibility after D30 pass', () => {
  const basePages = getEligibleOldCyclePages(rawSeed, [], '2026-11-04');
  assert.equal(basePages.length, 341);
  assert.equal(basePages[0], 1);
  assert.equal(basePages[340], 341);

  // If page 342 is learned on 2026-11-04 and passes D30 on 2026-12-04
  const events: RecitationEvent[] = [
    {
      id: 'p342-new',
      page: 342,
      date: '2026-11-04',
      type: 'new',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
    {
      id: 'p342-d30',
      page: 342,
      date: '2026-12-04',
      type: 'review',
      passed: true,
      withoutLooking: true,
      prompts: 0,
      selfCorrections: 0,
      repeatedError: false,
    },
  ];

  const eligibleAfterD30 = getEligibleOldCyclePages(rawSeed, events, '2026-12-04');
  assert.equal(eligibleAfterD30.length, 342);
  assert.ok(eligibleAfterD30.includes(342));
});
