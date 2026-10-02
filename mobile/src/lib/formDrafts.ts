// Memory only: never persist passwords or other form fields on disk.
const drafts = new Map<string, Map<string, unknown>>();
export function readDraft<T>(account: string, key: string, initial: T | (() => T)): T {
  const values = drafts.get(account);
  return values?.has(key) ? values.get(key) as T : typeof initial === "function" ? (initial as () => T)() : initial;
}
export function writeDraft<T>(account: string, key: string, value: T) {
  if (!drafts.has(account)) drafts.set(account, new Map());
  drafts.get(account)!.set(key, value);
}
export function clearDrafts(account: string, prefix: string) {
  const values = drafts.get(account);
  values?.forEach((_, key) => { if (key.startsWith(prefix)) values.delete(key); });
}
export function clearAllDrafts() { drafts.clear(); }
