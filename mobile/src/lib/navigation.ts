export const APP_TABS = [
  { name: "index", title: "Trang chủ", icon: "home-outline", focusedIcon: "home", href: "/(tabs)" },
  { name: "nutrition", title: "Dinh dưỡng", icon: "nutrition-outline", focusedIcon: "nutrition", href: "/(tabs)/nutrition" },
  { name: "workout", title: "Tập luyện", icon: "barbell-outline", focusedIcon: "barbell", href: "/(tabs)/workout" },
  { name: "progress", title: "Tiến độ", icon: "stats-chart-outline", focusedIcon: "stats-chart", href: "/(tabs)/progress" },
  { name: "profile", title: "Cá nhân", icon: "person-outline", focusedIcon: "person", href: "/(tabs)/profile" },
] as const;
export type AppTab = typeof APP_TABS[number]["name"];
export type TabHref = typeof APP_TABS[number]["href"];
const cleanPath = (path: string) => path.replace(/\/\([^/]+\)/g, "").split("?")[0] || "/";

export function activeTab(path: string): AppTab {
  const current = cleanPath(path);
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
export function selectTab(nav: NavigationDriver, path: string, tab: AppTab) {
  const href = APP_TABS.find((item) => item.name === tab)!.href;
  if (cleanPath(path) !== cleanPath(href)) nav.dismissTo(href);
}
