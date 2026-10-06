import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, Text, TextInput } from "react-native";
import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { localizeMessage, translateFor, useTranslation } from "@/i18n";
import { useLanguageStore } from "@/stores/languageStore";
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn().mockResolvedValue(undefined) }));
beforeEach(() => { jest.clearAllMocks(); useLanguageStore.setState({ locale: "vi", hydrated: false, storageError: false }); });
afterEach(() => useLanguageStore.setState({ locale: "vi" }));
function Form() {
  const { t } = useTranslation(); const [value, setValue] = useState("");
  return <><LanguagePicker /><Text>{t("Trang chủ")}</Text><TextInput accessibilityLabel="draft" value={value} onChangeText={setValue} /></>;
}
it("switches mounted UI without resetting form state and persists the choice", async () => {
  await render(<Form />);
  await fireEvent.changeText(screen.getByLabelText("draft"), "Buổi tập của tôi");
  await fireEvent.press(screen.getByRole("radio", { name: "English" }));
  expect(screen.getByText("Home")).toBeTruthy();
  expect(screen.getByLabelText("draft").props.value).toBe("Buổi tập của tôi");
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith("fittrack.language", "en");
});
it("restores saved English and defaults invalid values to Vietnamese", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("en");
  await useLanguageStore.getState().hydrate();
  expect(useLanguageStore.getState().locale).toBe("en");
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("fr");
  await useLanguageStore.getState().hydrate();
  expect(useLanguageStore.getState().locale).toBe("vi");
});
it("does not let slow hydration overwrite a new selection", async () => {
  let resolve!: (value: string) => void;
  jest.mocked(SecureStore.getItemAsync).mockReturnValue(new Promise(r => { resolve = r; }));
  const hydration = useLanguageStore.getState().hydrate();
  await useLanguageStore.getState().setLocale("en");
  resolve("vi"); await hydration;
  expect(useLanguageStore.getState().locale).toBe("en");
});
it("interpolates safely and preserves unknown user text", () => {
  expect(translateFor("en", "Tăng {label}", { label: "$& Bench" })).toBe("Increase $& Bench");
  expect(translateFor("vi", "Tăng {label}", { label: "Set" })).toBe("Tăng Set");
  expect(translateFor("en", "Lịch riêng của tôi")).toBe("Lịch riêng của tôi");
  expect(translateFor("en", "constructor")).toBe("constructor");
  expect(localizeMessage("en", "Vui lòng nhập email")).toBe("Enter your email");
  expect(localizeMessage("vi", "Enter your email")).toBe("Vui lòng nhập email");
});
it("persists and restores the browser preference", async () => {
  const platform = Platform.OS;
  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const items = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  } });
  try {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    await useLanguageStore.getState().setLocale("en");
    useLanguageStore.setState({ locale: "vi" });
    await useLanguageStore.getState().hydrate();
    expect(useLanguageStore.getState().locale).toBe("en");
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
    if (storage) Object.defineProperty(globalThis, "localStorage", storage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
it("shows storage failure without preventing immediate switching", async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("storage"));
  await render(<Form />);
  await act(() => useLanguageStore.getState().setLocale("en"));
  expect(screen.getByText("Home")).toBeTruthy();
  expect(screen.getByText(/Could not save your language/)).toBeTruthy();
});
