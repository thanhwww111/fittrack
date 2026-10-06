import { renderRouter, screen, fireEvent, waitFor, act } from "expo-router/testing-library";
import { Stack, router, usePathname } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { Text, View } from "react-native";
import path from "node:path";
import type { AppFooter as FooterComponent } from "@/components/navigation/AppFooter";
import { useLanguageStore } from "@/stores/languageStore";

afterEach(() => useLanguageStore.setState({ locale: "vi" }));

// Exercise the real production compiler: it can cache translated labels even
// though the language subscription triggered a render. Plain Jest misses that.
const babel = require("@babel/core");
const compiled = babel.transformFileSync(path.join(__dirname, "../src/components/navigation/AppFooter.tsx"), {
  configFile: false, babelrc: false,
  plugins: ["babel-plugin-react-compiler", ["@babel/plugin-transform-typescript", { isTSX: true }],
    ["@babel/plugin-transform-react-jsx", { runtime: "automatic" }], "@babel/plugin-transform-modules-commonjs"],
});
const compiledModule = { exports: {} as { AppFooter: typeof FooterComponent } };
new Function("require", "module", "exports", compiled.code)(require, compiledModule, compiledModule.exports);
const { AppFooter } = compiledModule.exports;

function Layout() {
  const path = usePathname();
  return <View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false }} /><AppFooter /><Text testID="path">{path}</Text></View>;
}
function TabLayout() { return <Tabs tabBar={() => null} screenOptions={{ headerShown: false }} />; }
const routes = {
  _layout: Layout,
  "(tabs)/_layout": TabLayout,
  "(tabs)/index": () => <Text>Home screen</Text>,
  "(tabs)/nutrition": () => <Text>Nutrition screen</Text>,
  "(tabs)/workout": () => <Text>Workout screen</Text>,
  "(tabs)/progress": () => <Text>Progress screen</Text>,
  "(tabs)/profile": () => <Text>Profile screen</Text>,
  "food/create": () => <Text>Food form</Text>,
};
it("switches every footer tab through the real router and returns from a form", async () => {
  await renderRouter(routes, { initialUrl: "/" });
  for (const [title, path] of [["Dinh dưỡng", "/nutrition"], ["Tập luyện", "/workout"], ["Tiến độ", "/progress"], ["Cá nhân", "/profile"], ["Trang chủ", "/"]]) {
    await fireEvent.press(screen.getByRole("tab", { name: title }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent(path, { exact: true }));
  }
  await act(() => router.push("/food/create"));
  await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/food/create", { exact: true }));
  await fireEvent.press(screen.getByRole("tab", { name: "Tập luyện" }));
  await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/workout", { exact: true }));
  await act(() => useLanguageStore.setState({ locale: "en" }));
  for (const [title, path] of [["Nutrition", "/nutrition"], ["Progress", "/progress"], ["Profile", "/profile"], ["Home", "/"], ["Workout", "/workout"]]) {
    await fireEvent.press(screen.getByRole("tab", { name: title }));
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent(path, { exact: true }));
  }
  await act(() => useLanguageStore.setState({ locale: "vi" }));
  expect(screen.getByRole("tab", { name: "Tập luyện" })).toBeTruthy();
});
