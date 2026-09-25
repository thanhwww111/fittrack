import { Alert, Platform } from "react-native";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText: string;
  destructive?: boolean;
}

// Hộp thoại xác nhận. Alert có nút chỉ chạy trên iOS/Android, web thì chấp nhận luôn.
export function confirmAction({ title, message, confirmText, destructive }: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    if (Platform.OS === "web") {
      resolve(true);
      return;
    }
    Alert.alert(
      title,
      message,
      [
        { text: "Huỷ", style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
