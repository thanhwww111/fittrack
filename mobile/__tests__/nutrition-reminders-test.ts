import {
  buildNutritionReminders,
  MAX_MEAL_REMINDERS,
  nextFreeReminderTime,
  validateMealReminders,
} from "@/lib/nutritionReminders";

const items = [
  { time: "07:00", label: "Bữa sáng" },
  { time: "12:00", label: "Bữa trưa" },
  { time: "19:00", label: "Bữa tối" },
];
const target = { calories: 2300, protein: 160, carbs: 230, fat: 70 };
const none = { calories: 0, protein: 0, carbs: 0, fat: 0 };

// 10:30 sáng ngày 26/9 theo giờ máy
const now = new Date(2026, 8, 26, 10, 30);

describe("buildNutritionReminders", () => {
  it("schedules the remaining reminders of today and every reminder of the next days", () => {
    const reminders = buildNutritionReminders({ now, target, consumed: none, items, days: 2 });

    expect(reminders.map((r) => [r.id, r.date.getDate(), r.date.getHours()])).toEqual([
      ["meal-2026-09-26-1200", 26, 12],
      ["meal-2026-09-26-1900", 26, 19],
      ["meal-2026-09-27-0700", 27, 7],
      ["meal-2026-09-27-1200", 27, 12],
      ["meal-2026-09-27-1900", 27, 19],
    ]);
  });

  it("says how much is still missing today, titled with the user's label", () => {
    const consumed = { calories: 850, protein: 62, carbs: 90, fat: 30 };
    const [lunch] = buildNutritionReminders({ now, target, consumed, items, days: 1 });

    expect(lunch.title).toBe("🍱 Bữa trưa");
    expect(lunch.body).toBe("Còn thiếu 1.450 kcal · 98 g protein hôm nay. Nạp bữa trưa đủ chất nhé!");
  });

  it("supports custom reminders and picks the tip from the time of day", () => {
    const custom = [{ time: "15:30", label: "Bữa phụ chiều" }];
    const [snack] = buildNutritionReminders({ now, target, consumed: none, items: custom, days: 1 });

    expect(snack.id).toBe("meal-2026-09-26-1530");
    expect(snack.title).toBe("🍎 Bữa phụ chiều");
    expect(snack.body).toContain("Một bữa phụ nhỏ giúp bạn đủ chất nhé!");
  });

  it("uses the full target for future days since nothing is logged yet", () => {
    const consumed = { calories: 2000, protein: 150, carbs: 200, fat: 60 };
    const reminders = buildNutritionReminders({ now, target, consumed, items, days: 2 });
    const tomorrow = reminders.find((r) => r.id === "meal-2026-09-27-0700")!;

    expect(tomorrow.title).toBe("☀️ Bữa sáng");
    expect(tomorrow.body).toContain("Còn thiếu 2.300 kcal · 160 g protein");
  });

  it("stops reminding today once both calories and protein are met", () => {
    const consumed = { calories: 2350, protein: 165, carbs: 230, fat: 70 };
    const reminders = buildNutritionReminders({ now, target, consumed, items, days: 2 });

    expect(reminders.some((r) => r.id.startsWith("meal-2026-09-26"))).toBe(false);
    expect(reminders).toHaveLength(3);
  });

  it("mentions only the part that is still missing", () => {
    const consumed = { calories: 2400, protein: 120, carbs: 250, fat: 80 };
    const [lunch] = buildNutritionReminders({ now, target, consumed, items, days: 1 });

    expect(lunch.body).toBe("Đã đủ calo, còn thiếu 40 g protein. Nạp bữa trưa đủ chất nhé!");
  });

  it("falls back to a plain logging reminder without a nutrition target", () => {
    const [lunch] = buildNutritionReminders({ now, target: null, consumed: none, items, days: 1 });

    expect(lunch.title).toBe("🍽️ Đừng quên ghi bữa ăn");
    expect(lunch.body).toBe("Ghi lại bữa trưa để theo dõi calo và protein.");
  });
});

describe("editing meal reminders", () => {
  it("suggests an afternoon snack slot, or the next free hour when it is taken", () => {
    expect(nextFreeReminderTime(items)).toBe("15:30");
    expect(nextFreeReminderTime([...items, { time: "15:30", label: "Bữa phụ" }])).toBe("06:00");
  });

  it("accepts a valid list and explains what is wrong otherwise", () => {
    expect(validateMealReminders(items)).toBeNull();
    expect(validateMealReminders([{ time: "7:00", label: "Sáng" }])).toBe("Giờ phải có dạng HH:mm, ví dụ 07:00.");
    expect(validateMealReminders([{ time: "07:00", label: "  " }])).toBe("Đặt tên cho từng lần nhắc.");
    expect(
      validateMealReminders([
        { time: "07:00", label: "A" },
        { time: "07:00", label: "B" },
      ])
    ).toBe("Hai lần nhắc không được trùng giờ.");
    const tooMany = Array.from({ length: MAX_MEAL_REMINDERS + 1 }, (_, i) => ({
      time: `${String(10 + i)}:00`,
      label: `Nhắc ${i}`,
    }));
    expect(validateMealReminders(tooMany)).toBe(`Tối đa ${MAX_MEAL_REMINDERS} lần nhắc.`);
  });
});
