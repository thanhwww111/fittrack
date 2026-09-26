import { GoogleGenAI } from "@google/genai";
import { z, type ZodType } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

let client: GoogleGenAI | null = null;

function getClient() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, "AI features are not configured on this server");
  }
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

const UNSUPPORTED_KEYS = new Set(["$schema", "additionalProperties"]);

// Gemini chỉ hỗ trợ một phần JSON Schema: bỏ các khoá mà z.toJSONSchema sinh ra ở mọi cấp.
// Output vẫn được Zod kiểm tra đầy đủ sau khi nhận về.
export function toGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toGeminiSchema);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !UNSUPPORTED_KEYS.has(key))
        .map(([key, v]) => [key, toGeminiSchema(v)])
    );
  }
  return value;
}

interface GenerateJsonOptions<T> {
  system: string;
  prompt: string;
  schema: ZodType<T>;
}

// Gọi Gemini với structured output rồi validate lại bằng Zod:
// model có thể trả JSON sai dạng, không bao giờ tin output của AI mà không kiểm tra
async function generateJson<T>({ system, prompt, schema }: GenerateJsonOptions<T>): Promise<T> {
  const ai = getClient();

  let text: string | undefined;
  try {
    const interaction = await ai.interactions.create({
      model: env.GEMINI_MODEL,
      system_instruction: system,
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: toGeminiSchema(z.toJSONSchema(schema)) as Record<string, unknown>,
      },
      // Không lưu dữ liệu sức khoẻ của user phía Google
      store: false,
    });
    text = interaction.output_text;
  } catch (err) {
    console.error("Gemini request failed:", err);
    throw new AppError(502, "AI service is unavailable, please try again later");
  }

  try {
    return schema.parse(JSON.parse(text ?? ""));
  } catch {
    console.error("Gemini returned invalid JSON:", text?.slice(0, 500));
    throw new AppError(502, "AI returned an invalid response, please try again");
  }
}

// Gom vào object để test có thể thay thế bằng vi.spyOn(llm, "generateJson")
export const llm = { generateJson };
