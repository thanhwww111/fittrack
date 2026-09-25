import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

const SIZE = 256;

// Chọn ảnh trong thư viện, cắt vuông rồi thu về 256px JPEG để lưu thẳng vào DB (~20–40 KB).
// Trả về data URI, hoặc null nếu người dùng huỷ.
export async function pickAvatar(): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets[0]) return null;

  const { uri, width, height } = picked.assets[0];
  const context = ImageManipulator.manipulate(uri);
  // iOS không ép tỉ lệ khi cắt: tự cắt phần vuông ở giữa
  const side = Math.min(width, height);
  if (width !== height) {
    context.crop({ originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side });
  }
  context.resize({ width: SIZE, height: SIZE });

  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  context.release();
  image.release();

  if (!result.base64) throw new Error("Không đọc được ảnh");
  return `data:image/jpeg;base64,${result.base64}`;
}
