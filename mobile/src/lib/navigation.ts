import { translate as t } from "@/i18n";
export const APP_TABS = [
  { name: "index", get title() { return t("Trang chủ"); }, icon: "home-outline", focusedIcon: "home", href: "/(tabs)" },
  { name: "nutrition", get title() { return t("Dinh dưỡng"); }, icon: "nutrition-outline", focusedIcon: "nutrition", href: "/(tabs)/nutrition" },
  { name: "workout", get title() { return t("Tập luyện"); }, icon: "barbell-outline", focusedIcon: "barbell", href: "/(tabs)/workout" },
  { name: "plan", get title() { return t("Kế hoạch"); }, icon: "calendar-outline", focusedIcon: "calendar", href: "/(tabs)/plan" },
  { name: "progress", get title() { return t("Tiến độ"); }, icon: "stats-chart-outline", focusedIcon: "stats-chart", href: "/(tabs)/progress" },
  { name: "profile", get title() { return t("Cá nhân"); }, icon: "person-outline", focusedIcon: "person", href: "/(tabs)/profile" },
] as const;
export type AppTab = typeof APP_TABS[number]["name"];
export type TabHref = typeof APP_TABS[number]["href"];
const cleanPath = (path: string) => path.replace(/\/\([^/]+\)/g, "").split("?")[0] || "/";

export function activeTab(path: string): AppTab {
  const current = cleanPath(path);
  if (current === "/plan" || current.startsWith("/plan/")) return "plan";
  if (current === "/nutrition" || current.startsWith("/food/") || current === "/ai/meal") return "nutrition";
  if (current === "/workout" || current.startsWith("/workout/") || current === "/ai/workout") return "workout";
  if (current === "/progress" || current === "/history" || current.startsWith("/measurements")) return "progress";
  if (current === "/profile" || current.startsWith("/settings/")) return "profile";
  return "index";
}
export function parentTabHref(path: string): TabHref {
  return APP_TABS.find((tab) => tab.name === activeTab(path))!.href;
}
interface NavigationDriver { dismissTo: (href: TabHref) => void }
export function leaveScreen(nav: NavigationDriver & { canGoBack: () => boolean; back: () => void }, path: string) {
  if (nav.canGoBack()) nav.back();
  else nav.dismissTo(parentTabHref(path));
}
export function selectTab(nav: NavigationDriver & { navigate: (href: TabHref) => void }, path: string, tab: AppTab) {
  const href = APP_TABS.find((item) => item.name === tab)!.href;
  const current = cleanPath(path);
  if (current === cleanPath(href)) return;
  // JS tabs handle NAVIGATE, not the stack-only POP_TO emitted by dismissTo.
  // From a detail screen, dismiss back to the tab group to avoid retaining forms.
  if (APP_TABS.some((item) => cleanPath(item.href) === current)) nav.navigate(href);
  else nav.dismissTo(href);
}
