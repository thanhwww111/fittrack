import { activeTab, parentTabHref, leaveScreen, selectTab } from "@/lib/navigation";

describe("shared app navigation", () => {
  it.each([
    ["/", "index"], ["/(tabs)/nutrition", "nutrition"], ["/food/create", "nutrition"],
    ["/ai/meal", "nutrition"], ["/ai/workout", "workout"], ["/workout/template", "workout"],
    ["/history", "progress"], ["/measurements/edit", "progress"], ["/settings/account", "profile"],
  ])("maps %s to its parent tab", (path, expected) => expect(activeTab(path)).toBe(expected));

  it("backs or closes a popup to the original screen, with a deep-link parent fallback", () => {
    const nav = { canGoBack: () => true, back: jest.fn(), dismissTo: jest.fn() };
    leaveScreen(nav, "/workout/exercises");
    expect(nav.back).toHaveBeenCalledTimes(1);
    nav.canGoBack = () => false;
    leaveScreen(nav, "/food/add");
    expect(nav.dismissTo).toHaveBeenCalledWith("/(tabs)/nutrition");
    expect(parentTabHref("/history")).toBe("/(tabs)/progress");
  });

  it("selects tabs by dismissing instead of growing the stack and ignores the current root", () => {
    const nav = { dismissTo: jest.fn() };
    selectTab(nav, "/food/add", "nutrition");
    expect(nav.dismissTo).toHaveBeenCalledWith("/(tabs)/nutrition");
    nav.dismissTo.mockClear();
    selectTab(nav, "/nutrition", "nutrition");
    expect(nav.dismissTo).not.toHaveBeenCalled();
  });
});
