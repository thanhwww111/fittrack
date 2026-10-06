# AI PT — approved scope

User chose proactive plan/reminders/weekly adaptation plus chat and daily coaching, then explicitly requested implementation. Push is central. Implement in the existing dirty workspace without resetting or committing prior work.

The first release upgrades the existing yoga/walking seven-day Personal Plan; PT context also reads shared nutrition and recorded gym activity. AI proposes a validated, editable draft using owned real foods and selected activity availability, with rationale and daily guidance. It does not claim new 3D posture instruction or medical expertise. Never silently apply a plan, write consumption/activity logs, or change nutrition targets.

PT page provides persistent chat, daily energy/difficulty/check-in feedback, daily advice, weekly review and a button to generate the next draft. Missing logs are reported as unconfirmed, not proof of nonadherence. Chat uses bounded recent messages and current user-owned facts; preferences/feedback persist and personalize subsequent planning.

Coach settings: opt-in proactive push, default maximum3/day, optional1/2/5, quiet hours22:00–07:00 in profile timezone, gentle/firm tone, snooze. Reminders target before activity, overdue confirmation, completion encouragement and weekly review, with meaningful no-plan/non-gym fallback guidance. Suppress stale/superseded/completed events and duplicate local activity reminders while AI coaching owns activity reminders. Daily coach feed remains usable without push permission.

Server scheduler endpoint authenticated with CRON_SECRET creates/claims persisted jobs, enforces dedup/day budget/quiet hours/snooze and rechecks facts immediately before delivery. Expo tickets/receipts track provider handoff separately from user opening. Retry transient failures within event expiry; never claim exactly-once or guaranteed minute-level delivery. Existing weekly workflow is not sufficient for daily scheduling; add frequent external trigger instructions and a best-effort GitHub Actions workflow. Device tokens remain user scoped, revoke invalid tokens. No push or paid model call during automated tests.

AI uses existing Gemini JSON/Zod layer, validated structured output, bounded context, quota/timeouts and explicit unavailable errors. Missing key never mislabels a rules-based draft as AI. Foods/macros and dates are server-authoritative; AI cannot introduce unowned IDs, unavailable days or durations beyond survey. Request retry must not duplicate model calls or drafts.

Validation: mocked model/push backend tests for ownership, invalid structured output, concurrency, idempotency, quiet hours/timezone/day cap/snooze, completed/superseded events, receipts, chat persistence, feedback and weekly proposal. Mobile tests for settings/save/chat/draft links/account reset/notification deep links, then complete suites, typecheck/lint/web export. Real push needs EAS projectId and FCM/APNs credentials plus a built app/device; report unverified provisioning honestly.

Sources: https://docs.expo.dev/push-notifications/sending-notifications/ ; https://docs.expo.dev/push-notifications/push-notifications-setup/ ; https://ai.google.dev/gemini-api/docs/structured-output ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
