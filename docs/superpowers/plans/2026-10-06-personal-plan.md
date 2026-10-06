# Personal Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver yoga/walking surveys, editable seven-day plans, confirmed shared nutrition logging, independent activity history and reminders.

**Architecture:** Express/Zod/Mongoose implement ownership, immutable published plans and revision-controlled activations. Expo Router/Zustand render the survey, draft and current plan, integrating existing FoodLog and onboarding.

**Tech Stack:** Existing Express 5, Mongoose 9, Zod 4, TypeScript, Expo 57, React Native 0.86, Zustand, Vitest and Jest.

**Spec:** `docs/superpowers/specs/2026-10-06-personal-plan-design.md`

## Global Constraints

- Yoga or walking, one primary sport; seven concrete dates, no automatic repeat.
- Shared Food/NutritionTarget/Meal/FoodLog; no food log without confirmation.
- Activities never enter gym volume/PR; VI/EN; theme tokens; Expo 57 docs before API changes.
- Keep all prior dirty work. No commit/push or dependency installation is required.
- Execution authorized by user: “được duyệt bạn code đi”; implement inline without another authorization gate.

## Review Focus

- Concurrent retry of activation or meal logging must preserve a single result (Task 2).
- Food removal/change after preview must require renewed confirmation (Task 2/3).
- Past/expired activation must not consume a new plan's future items (Task 2).
- Logout followed by a late request must not populate another user's store (Task 3).
- Non-gym onboarding must remain accessible across restart and theme changes (Task 4).

### Task 1: Survey, generator and data contracts

**Files:** Create server/src/models/personalPlan.model.ts, server/src/schemas/personalPlan.schema.ts, server/src/utils/personalPlan.ts, server/src/constants/activityGuides.ts; test server/tests/personalPlan.test.ts.

**Interfaces:** SurveyInput has sport, experience, availableDays, mealTimes, preferredFoodIds, excludedFoodIds and revision. PlanData has timezone, startDate, endDate, surveySnapshot, targetSnapshot and days. `buildPlanDays(startDate, survey, foods, target)` returns seven dated days.

- [x] Write route tests expecting survey revisions, seven dates and three yoga sessions for selected weekdays; verify missing routes fail assertions.
- [x] Add strict Zod validation for unique days, finite minutes/quantities, valid dates/times and bounded arrays.
- [x] Implement typed schemas and a pure deterministic generator; meals use actual serving units and calculateNutrition.
- [x] Verify targeted tests and TypeScript.

```ts
expect(draft.days).toHaveLength(7);
expect(draft.days.filter((d: {activity: unknown}) => d.activity)).toHaveLength(3);
expect(await FoodLogModel.countDocuments()).toBe(0);
```

### Task 2: Owned API and concurrency

**Files:** Create server/src/services/personalPlan.service.ts, server/src/controllers/personalPlan.controller.ts, server/src/routes/personalPlan.routes.ts; modify server/src/routes/index.ts, server/src/models/foodLog.model.ts and profile schema/model for trainingMode. Expand server/tests/personalPlan.test.ts.

**Interfaces:** GET/PUT survey; POST drafts; GET/PUT drafts/:id; POST drafts/:id/apply; GET current/history/history/:id; PUT activities/:id/log; POST items/:id/log. Responses use existing `{success,data}`. Mutable input includes revision, idempotent creates/applies include requestId.

- [x] Test ownership, stale survey/target/timezone, apply retries/concurrency, tomorrow replacement, item retries/delete/relog and no future activity/food logging.
- [x] Implement compare-and-swap state updates, unique request/draft/log indexes and effective activation checks. Default current query uses profile timezone.
- [x] Extend FoodLog with partial unique sourcePlanId/sourcePlanItemId; use buildFoodLog for confirmed entries and nutrient preview verification.
- [x] Run targeted API tests and typecheck; resolve all failures before mobile.

```ts
const results = await Promise.all([logItem(), logItem(), logItem()]);
expect(new Set(results.map(r => r.body.data.id)).size).toBe(1);
expect(await FoodLogModel.countDocuments()).toBe(1);
```

### Task 3: Mobile plan flow and shared food form

**Files:** Create mobile/src/types/personalPlan.ts, mobile/src/api/personalPlanApi.ts, mobile/src/stores/personalPlanStore.ts, mobile/src/lib/personalPlan.ts, mobile/src/components/plan/PlanDayCard.tsx, mobile/src/app/plan/{_layout,survey,draft,history}.tsx, mobile/src/app/(tabs)/plan.tsx; modify food/add.tsx and i18n/messages.ts. Create mobile/__tests__/personal-plan-test.tsx.

**Interfaces:** API consumes server contracts; store load checks auth identity and generation, reset invalidates pending requests. PlanDayCard links items to food/add with source plan/item, quantity and nutrition fingerprint; form confirms through personalPlanApi.logItem and reloads existing nutrition.

- [x] Test pending requests after reset, activity time validation, planned item form quantity and shared nutrition behavior.
- [x] Build survey editor with persisted server survey, day/time/minute editing and visible food preference/exclusion choices.
- [x] Build draft review with editable activities and food rows, totals/target deltas, conflict/retry errors and explicit apply button/date.
- [x] Build today/week/history, actual minutes/note/completion, missed/rest/expiry, target change notice and food log links.
- [x] Verify mobile tests, TypeScript and translation coverage.

```ts
const result = validateActivityMinutes('0');
expect(result).toBeNull();
expect(validateActivityMinutes('25')).toBe(25);
```

### Task 4: Navigation, onboarding and local reminders

**Files:** Modify mobile/src/lib/navigation.ts, mobile/src/app/{_layout,onboarding}.tsx, mobile/src/app/(tabs)/_layout.tsx, mobile/src/stores/resetOnLogout.ts, mobile/src/types/models.ts; create mobile/src/lib/personalPlanReminders.ts; modify notifications.ts and root login/foreground handling. Expand mobile tests and server profile tests.

**Interfaces:** UserProfile.trainingMode = GYM|OTHER; missing means GYM for old accounts. Plan reminders are keyed by activation/date/activity, use absolute timezone dates and cancel their prefix only. survey.remindersEnabled controls plan reminders separately from gym settings.

- [x] Test non-gym onboarding guard and navigation parent tab, timezone reminders, pending replacement cancellation and stale account request protection.
- [x] Persist mode server-side and route non-gym onboarding to survey without gym schedule requirements.
- [x] Add sixth tab/footer with compact labels and accessibility. Register plan stack, reset stores on logout/account switch.
- [x] Refresh plan reminders on login/apply/settings/foreground/language; preserve shared nutrition reminders and gym namespace.
- [x] Run server/mobile complete suites, both typechecks, mobile lint, web export and diff check.

## Execution ledger

2026-10-06: user authorized implementation of approved spec. Work in current develop checkout because required integration includes uncommitted prior work; do not stash/reset/create a clean checkout. Inline execution; defer commits per project instructions. API interfaces above agree across tasks. Physical-device checks require an available device; report limits honestly.

2026-10-06: Tasks 1–4 completed in place. Read-only code review corrections: enable effective historical backfill, reload changed food before confirmation, return nearest pending plus all upcoming activations, and allow unchanged drafts to refresh food snapshots. Regression tests also cover quantity recovery after clearing input and copied meal source-link removal. Reminders use up to 14 nearest activities across effective activations.

Final verification: server 28 suites / 272 tests, mobile 36 suites / 163 tests; both TypeScript checks pass; mobile lint has 0 errors and 2 existing axios warnings; Expo web export passes with 47 static routes; git diff --check passes. Automated coverage is represented by personalPlan*.test.ts and personal-plan*.ts*. Physical-device notification/onboarding lifecycle and narrow-screen visual checks remain manual QA: no connected browser/device was available. No commit/push. See docs/PERSONAL_PLAN.md.
