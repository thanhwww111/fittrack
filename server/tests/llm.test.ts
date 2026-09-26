import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Thay SDK thật bằng mock: test không gọi mạng
const create = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { interactions: { create } };
  }),
}));

const { env } = await import("../src/config/env");
const { llm } = await import("../src/services/ai/llm");

const schema = z.object({ answer: z.string(), score: z.number().min(0).max(10) });
const call = () => llm.generateJson({ system: "sys", prompt: "hello", schema });

describe("llm.generateJson", () => {
  beforeEach(() => {
    env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    env.GEMINI_API_KEY = undefined;
    create.mockReset();
    vi.restoreAllMocks();
  });

  it("returns 503 when no API key is configured", async () => {
    env.GEMINI_API_KEY = undefined;
    await expect(call()).rejects.toMatchObject({ statusCode: 503 });
    expect(create).not.toHaveBeenCalled();
  });

  it("requests structured JSON without storing data and validates the result", async () => {
    create.mockResolvedValue({ output_text: '{"answer":"ok","score":7}' });

    await expect(call()).resolves.toEqual({ answer: "ok", score: 7 });

    const request = create.mock.calls[0][0];
    expect(request).toMatchObject({
      model: env.GEMINI_MODEL,
      system_instruction: "sys",
      input: "hello",
      store: false,
      response_format: { type: "text", mime_type: "application/json" },
    });
    expect(request.response_format.schema.required).toEqual(["answer", "score"]);
    expect(JSON.stringify(request.response_format.schema)).not.toContain("additionalProperties");
  });

  it("rejects output that does not match the schema", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockResolvedValue({ output_text: '{"answer":"ok","score":99}' });
    await expect(call()).rejects.toMatchObject({ statusCode: 502 });

    create.mockResolvedValue({ output_text: "not json" });
    await expect(call()).rejects.toMatchObject({ statusCode: 502 });
  });

  it("maps SDK failures to 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new Error("quota exceeded"));
    await expect(call()).rejects.toMatchObject({ statusCode: 502 });
  });
});
