import { colors, setActiveScheme, themedStyles } from "@/constants/theme";

afterEach(() => setActiveScheme("light"));

describe("theme", () => {
  it("colors follow the active scheme", () => {
    setActiveScheme("light");
    const light = colors.background;
    setActiveScheme("dark");
    expect(colors.background).not.toBe(light);
  });

  it("themedStyles rebuilds styles per scheme and caches them", () => {
    let calls = 0;
    const styles = themedStyles(() => {
      calls += 1;
      return { card: { backgroundColor: colors.surface, padding: 4 } };
    });

    setActiveScheme("light");
    const lightCard = styles.card;
    expect(styles.card).toBe(lightCard);

    setActiveScheme("dark");
    expect(styles.card.backgroundColor).not.toBe(lightCard.backgroundColor);
    expect(styles.card.padding).toBe(4);

    setActiveScheme("light");
    expect(styles.card).toBe(lightCard);
    expect(calls).toBe(2);
  });
});
