import { readDraft, writeDraft, clearDrafts, clearAllDrafts } from "@/lib/formDrafts";

beforeEach(clearAllDrafts);
it("retains an unsaved form across unmount/back/tab and scopes drafts to the account", () => {
  writeDraft("a", "food:new:name", "Phở");
  expect(readDraft("a", "food:new:name", "")).toBe("Phở");
  expect(readDraft("b", "food:new:name", "")).toBe("");
});
it("successful save clears only its form; logout clears every draft", () => {
  writeDraft("a", "food:new:name", "Phở");
  writeDraft("a", "template:new:name", "Upper");
  clearDrafts("a", "food:new:");
  expect(readDraft("a", "food:new:name", "")).toBe("");
  expect(readDraft("a", "template:new:name", "")).toBe("Upper");
  clearAllDrafts();
  expect(readDraft("a", "template:new:name", "")).toBe("");
});
