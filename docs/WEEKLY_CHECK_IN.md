# Weekly measurement check-in

Every week starts at 00:00 Monday in the user's profile timezone. After onboarding, the app requires confirmation of weight and height once per week. If Monday is missed, the requirement remains until the user next opens the app and saves. First onboarding measurements count for that week; unrelated profile edits do not reset the requirement.

The server derives the week and stores `UserProfile.measurementsConfirmedAt`; a local flag cannot clear the prompt. `GET /api/profile/weekly-check-in` reports status and `POST` accepts validated `weight` and `height`. Saving upserts today's history record, preserves existing circumference measurements, synchronizes profile measurements and records completion last. Retrying after a failed response does not duplicate the daily record. Actual weight may cross a goal without being rejected as an invalid goal setting.

The mobile gate overlays the existing navigation stack, preserving the active workout and drafts. It offers save/retry/logout, with no skip or close action. Weight must be entered; unchanged height can be confirmed. It checks on foreground and detects a week rollover within one minute while active, without querying the server every minute. Saving uses the existing optional AUTO-target recalculation flow; manual targets remain unchanged.

This is an in-app requirement, not an OS alarm: a closed app cannot display a blocking form. It appears on the next launch/foreground. Completion is shared across devices through the server.

Tests cover the timezone/week boundary, year boundary, onboarding, validation, crossed goals, preserved daily history, retries, account isolation, foreground refresh and rollover while the app stays open.

Focused dashboard, progress, daily history and measurement history screens refresh after the profile or nutrition target changes, including a check-in saved over the current screen.

Verification (2026-10-05): mobile 151 tests across 32 suites; server 258 tests across 26 suites; both TypeScript checks passed; mobile lint passed with two existing Axios warnings; web export passed for 42 routes. Physical-device interaction has not been verified.
