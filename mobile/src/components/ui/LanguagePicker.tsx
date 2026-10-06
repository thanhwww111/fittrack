import { Text, View } from "react-native";
import { ChipGroup } from "./ChipGroup";
import { useTranslation } from "@/i18n";
import { useLanguageStore } from "@/stores/languageStore";
import { colors } from "@/constants/theme";

export function LanguagePicker() {
  const { t, locale } = useTranslation();
  const setLocale = useLanguageStore(state => state.setLocale);
  const storageError = useLanguageStore(state => state.storageError);
  return <View>
    <ChipGroup label={t("Ngôn ngữ")} value={locale} onChange={value => { void setLocale(value); }}
      options={[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "English" }]} />
    {storageError ? <Text style={{ color: colors.danger }}>{t("Không lưu được ngôn ngữ trên thiết bị. Vui lòng chọn lại để thử lưu.")}</Text> : null}
  </View>;
}
