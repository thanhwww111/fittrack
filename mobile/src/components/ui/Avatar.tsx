import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

interface AvatarProps {
  name: string | undefined;
  uri: string | null | undefined;
  size?: number;
}

// Ảnh đại diện tròn; chưa có ảnh thì hiện chữ cái đầu của tên
export function Avatar({ name, uri, size = 56 }: AvatarProps) {
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={box} contentFit="cover" accessibilityLabel="Ảnh đại diện" />;
  }
  return (
    <View style={[styles.fallback, box]} accessibilityLabel="Ảnh đại diện">
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  initials: { fontWeight: "700", color: colors.primary },
});
