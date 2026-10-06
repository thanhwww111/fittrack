import type { Movement } from "./exerciseGuides";

export type Point = readonly [number, number];
export interface Pose {
  head: Point; shoulder: Point; hip: Point; elbow: Point; hand: Point; knee: Point; foot: Point;
}
export interface Motion {
  start: Pose; end: Pose;
  view?: "front";
  equipment: "barbell" | "dumbbells" | "hammer" | "cable" | "pullbar" | "squatbar" | "hipbar" | "platform" | "none";
  bench?: readonly [number, number, number, number];
}
const standing: Pose = { head: [156, 36], shoulder: [156, 66], hip: [156, 130], elbow: [161, 102], hand: [164, 140], knee: [152, 175], foot: [152, 220] };
const lying: Pose = { head: [66, 137], shoulder: [92, 140], hip: [171, 143], elbow: [96, 101], hand: [96, 63], knee: [208, 176], foot: [208, 220] };
const bent: Pose = { ...standing, head: [203, 98] as Point, shoulder: [181, 111] as Point, hip: [120, 129] as Point, elbow: [183, 148] as Point, hand: [184, 184] as Point };
const hanging: Pose = { head: [156, 78], shoulder: [156, 104], hip: [156, 162], elbow: [166, 68], hand: [169, 30], knee: [160, 196], foot: [160, 228] };
const seated: Pose = { ...standing, head: [145, 83], shoulder: [145, 111], hip: [145, 166], knee: [192, 168], foot: [195, 218] };
const incline: Pose = { head: [72, 77], shoulder: [94, 101], hip: [157, 151], elbow: [103, 65], hand: [107, 28], knee: [206, 174], foot: [207, 220] };
// Original 2D key poses on a 320 × 250 canvas. These illustrate movement direction,
// not a biomechanical model or a measurement of the user's technique.
export const motions: Record<Movement, Motion> = {
  bench: { start: lying, end: { ...lying, elbow: [115, 168], hand: [115, 131] }, equipment: "barbell", bench: [53, 157, 187, 157] },
  incline: { start: incline, end: { ...incline, elbow: [116, 134], hand: [121, 96] }, equipment: "dumbbells", bench: [61, 94, 160, 169] },
  fly: { start: { ...standing, elbow: [108, 87], hand: [72, 92] }, end: { ...standing, elbow: [139, 100], hand: [153, 111] }, equipment: "cable", view: "front" },
  pushup: { start: { head: [66, 105], shoulder: [92, 125], hip: [171, 161], elbow: [91, 171], hand: [92, 217], knee: [211, 188], foot: [254, 216] },
    end: { head: [67, 162], shoulder: [94, 177], hip: [169, 195], elbow: [132, 196], hand: [92, 217], knee: [211, 206], foot: [254, 216] }, equipment: "none" },
  deadlift: { start: standing, end: { ...standing, head: [195, 113], shoulder: [172, 130], hip: [113, 147], knee: [156, 176], elbow: [173, 165], hand: [173, 201] }, equipment: "barbell" },
  row: { start: bent, end: { ...bent, elbow: [141, 101], hand: [139, 139] }, equipment: "barbell" },
  pullup: { start: hanging, end: { ...hanging, head: [153, 25], shoulder: [153, 52], hip: [153, 110], elbow: [187, 73], hand: [169, 30], knee: [164, 157], foot: [159, 203] }, equipment: "pullbar" },
  pulldown: { start: { ...seated, elbow: [150, 72], hand: [155, 35] }, end: { ...seated, elbow: [156, 147], hand: [174, 114] }, equipment: "cable", bench: [121, 173, 174, 173] },
  press: { start: { ...standing, head: [156, 62], shoulder: [156, 91], hip: [156, 151], knee: [152, 186], elbow: [179, 119], hand: [183, 82] },
    end: { ...standing, head: [156, 62], shoulder: [156, 91], hip: [156, 151], knee: [152, 186], elbow: [158, 54], hand: [158, 16] }, equipment: "barbell" },
  raise: { start: { ...standing, elbow: [132, 102], hand: [130, 140] }, end: { ...standing, elbow: [110, 76], hand: [71, 84] }, equipment: "dumbbells", view: "front" },
  curl: { start: standing, end: { ...standing, hand: [184, 73] }, equipment: "barbell" },
  hammer: { start: standing, end: { ...standing, hand: [186, 74] }, equipment: "hammer" },
  pushdown: { start: { ...standing, hand: [197, 92] }, end: standing, equipment: "cable" },
  squat: { start: { ...standing, elbow: [175, 100], hand: [185, 62] },
    end: { ...standing, head: [173, 90], shoulder: [154, 113], hip: [122, 169], elbow: [180, 140], hand: [187, 106], knee: [177, 186] }, equipment: "squatbar" },
  rdl: { start: standing, end: bent, equipment: "barbell" },
  legpress: { start: { head: [73, 134], shoulder: [93, 155], hip: [130, 204], elbow: [105, 191], hand: [141, 210], knee: [171, 158], foot: [207, 111] },
    end: { head: [73, 134], shoulder: [93, 155], hip: [130, 204], elbow: [105, 191], hand: [141, 210], knee: [187, 190], foot: [164, 135] }, equipment: "platform", bench: [65, 144, 133, 221] },
  hipthrust: { start: { head: [76, 118], shoulder: [99, 135], hip: [157, 181], elbow: [119, 168], hand: [154, 183], knee: [203, 173], foot: [210, 220] },
    end: { head: [69, 129], shoulder: [99, 135], hip: [171, 135], elbow: [132, 152], hand: [168, 145], knee: [213, 172], foot: [210, 220] }, equipment: "hipbar", bench: [52, 147, 109, 147] },
  legraise: { start: hanging, end: { ...hanging, knee: [196, 162], foot: [235, 162] }, equipment: "pullbar" },
};
export function interpolatePose(motion: Motion, progress: number): Pose {
  const amount = Math.max(0, Math.min(1, progress));
  return Object.fromEntries(Object.entries(motion.start).map(([key, from]) => {
    const to = motion.end[key as keyof Pose];
    return [key, [from[0] + (to[0] - from[0]) * amount, from[1] + (to[1] - from[1]) * amount]];
  })) as unknown as Pose;
}
