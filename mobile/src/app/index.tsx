import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { checkHealth } from "@/api/healthApi";

export default function Index() {
  const [result, setResult] = useState("Chưa kiểm tra");
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    setLoading(true);
    try {
      const data = await checkHealth();
      setResult(`✅ API: ${data.status} | DB: ${data.db}`);
    } catch (err) {
      setResult(`❌ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FitTrack</Text>
      <Text style={styles.url}>{process.env.EXPO_PUBLIC_API_URL}</Text>

      <Pressable style={styles.button} onPress={handleCheck} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Kiểm tra kết nối</Text>
        )}
      </Pressable>

      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: "700" },
  url: { fontSize: 12, color: "#888" },
  button: { backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, minWidth: 180, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  result: { fontSize: 16, textAlign: "center" },
});