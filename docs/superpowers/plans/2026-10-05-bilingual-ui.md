# Vietnamese and English UI

User requested implementation: a persistent Vietnamese/English switch, Vietnamese notes for English exercise names, then an animated exercise-video feature proposal (proposal only).

## Design
- Device preference defaults to Vietnamese, retained across logout and launches.
- Switching updates mounted screens and navigation without resetting forms or workouts.
- Source Vietnamese UI messages map to English catalogs, with named interpolation for dynamic text. Missing entries fall back to the original text.
- User-created names/notes and AI generated content remain original content; do not translate stored records.
- Keep canonical exercise names and add Vietnamese explanatory labels for seeded exercises.
- Reuse existing Expo SecureStore/web localStorage persistence. No new runtime dependency.

## Tasks
- [x] Core language store, translator, language picker, navigation/common components.
- [x] Auth/onboarding/profile/settings screens and catalog.
- [x] Nutrition/food/AI meal screens and catalog.
- [x] Workout screens and exercise notes/catalog.
- [x] Progress/history/measurements, alerts/formatters and local notification language.
- [x] Verify persistence, live switching, interpolation, original user content, exercise notes and existing tests/typecheck/lint/export.
- [x] Propose animated exercise guidance without implementing or buying video content.

Work remains in the user's workspace alongside their recent approved changes. No commit/push requested for this task.

## Implementation notes
- Picker appears in Profile, authentication forms and onboarding. SecureStore on native and localStorage on web retain the preference.
- Eighteen seeded exercises have Vietnamese explanations; search accepts Vietnamese with or without accents. User-created content and AI responses are preserved.
- Some existing label getters and formatters read the external language store. Their subscribed consumers temporarily opt out of React Compiler memoization so switching cannot cache old labels; the compiler remains enabled elsewhere. The footer integration test runs the actual compiler before rendering and checks live switching through the real router.
- Remote server push messages and OS permission dialogs are outside this UI-only translation change. Local scheduled reminders are rebuilt in the selected language.
- Browser UI automation could not start its runtime in this environment. Native device visual checks remain manual.

## Animated exercise guidance proposal (not implemented)
Add a “View movement” action beside each seeded exercise, opening a dismissible modal with a short looping animation, 0.5x/1x playback and bilingual instructions. Start with the 18 existing exercises, preserve the active workout and timer, and use reviewed, licensed clips rather than generating unverified movement demonstrations.

## Verification — 2026-10-05
- Mobile Jest: 137 tests passed across 28 suites, including real-router navigation after compiling the footer with React Compiler, browser/native preference persistence, and preserved form drafts.
- Server Vitest: 253 tests passed across 25 files, including the existing Upper/Lower changes in this workspace.
- Mobile and server TypeScript checks passed.
- Expo lint: no errors; two pre-existing Axios import warnings in `src/api/client.ts`.
- Expo production web export passed (42 routes, React Compiler enabled).
- `git diff --check` passed. Browser/native visual verification remains unperformed as noted above.
