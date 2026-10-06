# AI PT

## Current implementation

The PT screen provides persistent chat, daily/weekly review requests, energy/difficulty check-ins and push preferences. Push is opt-in, capped at 3 jobs per local day by default, with quiet hours 22:00–07:00 and optional snooze. Users can select 1, 2, 3 or 5 reminders. Opening a notification is acknowledged separately from Expo acceptance.

PT advice proposes changes for the user to review. It never applies a plan, changes nutrition targets or records a meal/workout automatically. The structured AI plan generator validates seven exact dates, selected availability, real food IDs/quantities, rest days and beginner intensity. Server calculations supply food macros.

## Data-sharing gate

New coaching AI requests are disabled unless `COACH_AI_DATA_SHARING_CONSENT=true` is configured. Google Gemini receives bounded physical-profile/survey facts, recent diet/exercise logs, check-ins and conversation context for personalization. Passwords, JWTs and contact details are excluded. This setting requires a confirmed data-sharing decision; push opt-in alone is not AI data-sharing consent.

On 2026-10-06 the user asked to finish after the explicit provider/payload consent question. The normally reviewed edits were subsequently accepted, and PersonalPlan draft creation now uses the Gemini generator with `generatorVersion: ai-pt-v1`. The local server consent flag is enabled; deployment environments still require the setting explicitly. Older `rules-v1` plans remain readable.

Draft requests have persistent user/request-ID claims, a two-minute lease, a five-attempt local-day quota and a 45-second model timeout. Completed results replay without another model call. Uncertain network failures retain the request ID; confirmed terminal failures offer a deliberate new attempt. Survey, nutrition target, timezone, current-plan revision, selected foods and meal ownership are checked again before saving. AI/provider errors are surfaced; no rules-based fallback is presented as AI.

## Push operation

The coach cron endpoint requires the existing cron secret. Scheduled execution needs the hosted API URL and secret configured in GitHub Actions. Scheduled jobs can be delayed, so reminders are best effort. Expo tickets mean Expo accepted the request; successful receipts mean the platform push service accepted it, not that the device displayed it. The implementation retains ticket/receipt status and handles invalid device tokens and retries.

Actual Android/iOS delivery requires the app build's Expo project configuration and FCM/APNs credentials, device permission and a registered push token. Unit/API tests mock Gemini and Expo; they do not verify real delivery or consume paid AI calls. No deployment or device push verification has been performed in this session.

## Verification, 2026-10-06

Before the final draft integration, full server suite: 33 suites / 292 tests passed; mobile: 41 suites / 182 tests passed. Final integration regression results are recorded below after verification. Independent review confirmed explicit fresh-request recovery after terminal AI failures and preservation of accepted tickets when a later push batch fails. Changes are uncommitted and have not been deployed.

Final verification: server 34 suites / 302 tests; mobile 42 suites / 189 tests; both TypeScript checks passed. Mobile lint has zero errors and two existing Axios warnings. Expo web export passed with 48 routes. Independent review confirmed request identities survive theme/remount retries. Existing MongoDB on C: could not build indexes with less than 500 MB free, so the full server suite ran against an isolated localhost test instance on D:; the owned process/data were then removed. The existing MongoDB/data were unchanged. Free space on C: remains a local runtime concern.

Operational setup and payload details: [AI PT operations](ai-pt-operations.md).
