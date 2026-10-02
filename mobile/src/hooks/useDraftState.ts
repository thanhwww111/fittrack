import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { clearAllDrafts, clearDrafts, readDraft, writeDraft } from "@/lib/formDrafts";
import { useAuthStore } from "@/stores/authStore";

/** A useState field retained for this account until saved or logged out. */
export function useDraftState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const account = useAuthStore((state) => state.user?.id) ?? "anonymous";
  const [value, setValue] = useState<T>(() => readDraft(account, key, initial));
  const update = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue((previous) => {
      const updated = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
      // A late callback from a logged-out screen must not restore its drafts.
      if ((useAuthStore.getState().user?.id ?? "anonymous") === account) writeDraft(account, key, updated);
      return updated;
    });
  }, [account, key]);
  return [value, update];
}
export function clearFormDrafts(prefix: string) {
  clearDrafts(useAuthStore.getState().user?.id ?? "anonymous", prefix);
}
export const clearAllFormDrafts = clearAllDrafts;
export function getFormDraft<T>(key: string, initial: T): T {
  return readDraft(useAuthStore.getState().user?.id ?? "anonymous", key, initial);
}
