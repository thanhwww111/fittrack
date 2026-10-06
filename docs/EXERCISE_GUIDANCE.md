# Exercise movement guidance

The View movement action opens an in-place modal from the exercise picker, workout logger, exercise details, templates, session history and schedule preview. Closing it does not navigate away or mutate a workout. The footer remains behind the modal; the modal has an explicit close button, Android back handling and web Escape handling.

The first version includes original FitTrack 2D SVG illustrations for all 18 seeded exercises, with Vietnamese/English instructions, pause/play and 0.5×/1× speed. It works offline and adds no application dependency. These are schematic movement illustrations, not 3D video clips or a biomechanical assessment. Unknown exercises and explicitly custom exercises do not receive an unrelated illustration.

## Content and implementation
- `mobile/src/lib/exerciseGuides.ts`: original bilingual steps and cues, matched to canonical seeded names.
- `mobile/src/lib/exerciseMotion.ts`: original start/end poses and equipment. No external exercise dataset or media is included.
- `ExerciseAnimation`: a four-second looping cycle at normal speed. Animation stops when the app backgrounds, playback pauses or the modal unmounts. Reduced-motion settings disable automatic playback.
- `ExerciseGuideButton`: modal and controls, loaded only when opened. It does not access workout actions, rep state or rest timers.

For a future 3D video version, supply licensed clips that match these exact exercises. Replace the illustration renderer while preserving the controls, translations and workout isolation. Do not substitute a similar-looking movement or copy unlicensed preview videos.

## Validation
Automated tests cover all 18 entries and languages, coordinate bounds, controls, reduced motion, animation cleanup and an actual ExerciseLogger draft surviving modal open/close without recording a set. Start/end illustrations were rendered and visually inspected. Native-device interaction still needs device testing.

Verified 2026-10-05: 143 mobile tests passed in 30 suites; TypeScript passed; Expo lint reported zero errors and two existing Axios warnings; production web export passed for 42 routes.
