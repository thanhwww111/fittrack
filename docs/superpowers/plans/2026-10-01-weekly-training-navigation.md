# Weekly Training Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for each owned task; independent domains may use dispatching-parallel-agents. No commits or pushes.

**Goal:** One applied weekly schedule drives onboarding, today's workout, history and reminders, with persistent navigation.
**Architecture:** Immutable schedule snapshots in server-owned schedule state; sessions reference their scheduled date. Existing template/library APIs remain compatible. Mobile uses one typed schedule API and shared layout/footer.
**Tech Stack:** Express/Mongoose/Zod; Expo 57/React Native/Zustand/TypeScript.
**Spec:** ../specs/2026-10-01-weekly-training-navigation-design.md

## Global Constraints
Implementation and automated verification completed on 2026-10-01. The original checklist below records planned scope; physical-device acceptance remains outstanding.

## Verification results — 2026-10-01
- Server: 25 suites, 251 tests passed; TypeScript passed.
- Mobile: 21 suites, 115 tests passed; TypeScript passed.
- Expo lint: zero errors, two existing axios import warnings.
- Expo web export: succeeded, 42 static routes.
- Implemented immutable schedule snapshots, activation today / changes tomorrow, idempotent activation/start, expired session preservation, onboarding selection, shared daily workout card, history status and unfinished-session link.
- Implemented authenticated footer, Back/Close controls, core form drafts, and schedule-driven local reminders with a 28-day horizon.
- Not verified on a physical device: closed-app notification delivery, permission prompts, native modal/footer layout and keyboard/safe-area behavior. No live AI provider test performed.
- No commit, push or deployment.

## Original constraints
- Preserve all existing workspace changes and historical records. No dependency additions.
- Account timezone governs dates; first activation today, subsequent change tomorrow.
- Missed days never move forward; native notifications require device verification.
- User authorized implementation directly after spec review.

## Review Focus
- Concurrent activation/start and retry must not duplicate schedule/session (task 1).
- Old template edits/deletion cannot rewrite history (task 1).
- Login/logout and late API responses cannot mix accounts (task 2/4).
- Navigation from a deep link and leaving an unsaved form has a safe destination (task 3).
- Timezone/day rollover and permission denial cannot leave invalid reminders (task 4).

## Task 1 — Server schedule
- [ ] Add failing schedule API tests: ownership, two activations today/tomorrow, snapshot stability, duplicate start, expiry and history.
- [ ] Implement schedule model/schema/service/controller/routes under /training-schedule.
- [ ] GET returns {today,timezone,current,pending,days}; days default yesterday through 28 days ahead; explicit from/to supported.
- [ ] Snapshot = {id,programId,name,effectiveFrom,timezone,days:[{dayOfWeek,templateId,templateName,exerciseCount,exercises}]}; day = {date,status,workout:null|{templateId,templateName,exerciseCount},sessionId:null|string}. Status NO_PLAN/REST/PLANNED/IN_PROGRESS/COMPLETED/MISSED.
- [ ] PUT {programId,requestId} applies owned program idempotently. POST /start starts today's snapshot, returns WorkoutSession. First activation today; later tomorrow.
- [ ] Expire previous-day scheduled sessions preserving sets; reject mutations after expiry. Link history to planned day. Delete account clears schedule.
- [ ] Run dedicated tests in isolated test DB, then server typecheck.

## Task 2 — Schedule mobile
- [ ] Add typed api/trainingScheduleApi.ts and types in types/trainingSchedule.ts matching task 1.
- [ ] Implement schedule selection reusable in onboarding and program library; map ordered preset workouts to selected weekdays. Upper/lower T2/T3/T6/T7.
- [ ] Test first selection, validation, retry and existing user selection.
- [ ] Replace dashboard list of all templates with today's schedule and start/continue/completed/rest state; share with home.
- [ ] Keep library edit/custom creation, apply saved programs with effective date notice. Connect daily history status.
- [ ] Run targeted mobile tests/typecheck.

## Task 3 — Persistent navigation
- [ ] Test path-to-tab mapping, deep link fallback and popup close.
- [ ] Implement common authenticated footer/root layout without rewriting existing URLs; remove duplicate inner tab bar. Onboarding/login do not show footer.
- [ ] Add explicit Back/Close controls on sub-stacks, fallback to parent tab. Protect dirty forms on back/tab/close without ending workout.
- [ ] Verify route inventory, safe area/content layout, lint/typecheck.

## Task 4 — Reminders and integration (root)
- [ ] Test pure schedule-to-reminder conversion: timezone, 07:00, rest, completed, denied, pending activation.
- [ ] Replace manual reminder weekdays with active schedule dates; schedule 28 DATE triggers maximum, synchronize on activation/login/resume/settings, cancel on logout.
- [ ] Set default time 07:00 while retaining explicit user settings. Link notification tap to workout tab, load fresh schedule.
- [ ] Read full changes and resolve integration issues. Run full server/mobile suites, both typechecks, lint and diff check.
- [ ] Record verified and unverified device behaviors; update spec/plan progress.
