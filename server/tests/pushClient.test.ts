import { describe, expect, it, vi } from "vitest";

const sendPushNotificationsAsync = vi.fn();
vi.mock("expo-server-sdk", () => {
  class Expo {
    static isExpoPushToken(token: unknown) {
      return typeof token === "string" && token.startsWith("ExponentPushToken[");
    }
    chunkPushNotifications<T>(messages: T[]) {
      return [messages];
    }
    sendPushNotificationsAsync = sendPushNotificationsAsync;
  }
  return { Expo };
});

const { pushClient } = await import("../src/services/push/pushClient");

describe("pushClient.send", () => {
  it("skips malformed tokens and reports unregistered devices", async () => {
    sendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: "r1" },
      { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
    ]);

    const result = await pushClient.send(
      ["ExponentPushToken[a]", "ExponentPushToken[b]", "not-a-token"],
      { title: "Hi", body: "There", data: { url: "/progress" } }
    );

    expect(result).toEqual({
      sent: 1,
      invalidTokens: ["not-a-token", "ExponentPushToken[b]"],
    });
    const messages = sendPushNotificationsAsync.mock.calls[0][0];
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      to: "ExponentPushToken[a]",
      title: "Hi",
      channelId: "default",
      data: { url: "/progress" },
    });
  });

  it("does not call Expo when there is no valid token", async () => {
    sendPushNotificationsAsync.mockClear();
    const result = await pushClient.send(["bad"], { title: "x", body: "y" });
    expect(result).toEqual({ sent: 0, invalidTokens: ["bad"] });
    expect(sendPushNotificationsAsync).not.toHaveBeenCalled();
  });
});
