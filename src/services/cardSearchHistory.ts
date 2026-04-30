/**
 * Per-browser quick-pick history for the card search dialog.
 *
 * Stores the last few unique searches (game + name + set + card number)
 * so users can re-run a recent lookup with one tap. Kept in localStorage
 * because search history is ephemeral, doesn't need to sync across devices,
 * and we don't want a network round-trip when opening the dialog.
 */

const STORAGE_KEY = "cc.cardSearchHistory.v1";
const MAX_ENTRIES = 8;

export interface CardSearchHistoryEntry {
  /** Which catalog this search ran against. */
  game: "pokemon" | "mtg";
  /** Free-text card name, may be empty when searching by set + #. */
  name: string;
  /** Set id/code that was selected, or "all". */
  setId: string;
  /** Human label for the set so we can render it without re-fetching. */
  setLabel: string | null;
  /** Card number portion (left of the slash). */
  cardNumber: string;
  /** When the search was last run, for sorting + display. */
  lastUsedAt: number;
}

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

const safeParse = (raw: string | null): CardSearchHistoryEntry[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive shape check — drop anything that doesn't look like an entry.
    return parsed.filter(
      (e): e is CardSearchHistoryEntry =>
        e &&
        typeof e === "object" &&
        (e.game === "pokemon" || e.game === "mtg") &&
        typeof e.name === "string" &&
        typeof e.setId === "string" &&
        typeof e.cardNumber === "string" &&
        typeof e.lastUsedAt === "number",
    );
  } catch {
    return [];
  }
};

/** Stable identity for an entry — used to dedupe repeats. */
const entryKey = (e: Pick<CardSearchHistoryEntry, "game" | "name" | "setId" | "cardNumber">) =>
  `${e.game}|${e.name.trim().toLowerCase()}|${e.setId}|${e.cardNumber.trim()}`;

export const getCardSearchHistory = (
  game?: CardSearchHistoryEntry["game"],
): CardSearchHistoryEntry[] => {
  if (!isBrowser()) return [];
  const all = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const filtered = game ? all.filter((e) => e.game === game) : all;
  return [...filtered].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
};

export const recordCardSearch = (
  entry: Omit<CardSearchHistoryEntry, "lastUsedAt">,
): void => {
  if (!isBrowser()) return;

  // Don't record empty searches (no name AND no card number AND no specific set).
  const hasName = entry.name.trim().length > 0;
  const hasNumber = entry.cardNumber.trim().length > 0;
  const hasSet = entry.setId !== "all";
  if (!hasName && !hasNumber && !hasSet) return;

  const existing = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const key = entryKey(entry);
  // Drop any prior copy of this exact search, then push to the front.
  const next: CardSearchHistoryEntry[] = [
    { ...entry, lastUsedAt: Date.now() },
    ...existing.filter((e) => entryKey(e) !== key),
  ].slice(0, MAX_ENTRIES);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — ignore silently.
  }
};

export const removeCardSearch = (
  entry: Pick<CardSearchHistoryEntry, "game" | "name" | "setId" | "cardNumber">,
): void => {
  if (!isBrowser()) return;
  const existing = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const key = entryKey(entry);
  const next = existing.filter((e) => entryKey(e) !== key);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
};

export const clearCardSearchHistory = (
  game?: CardSearchHistoryEntry["game"],
): void => {
  if (!isBrowser()) return;
  if (!game) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const remaining = safeParse(window.localStorage.getItem(STORAGE_KEY)).filter(
    (e) => e.game !== game,
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    /* ignore */
  }
};

/** Compact display label for a quick-pick chip, e.g. "Charizard · SVI #25". */
export const summarizeEntry = (e: CardSearchHistoryEntry): string => {
  const parts: string[] = [];
  if (e.name.trim()) parts.push(e.name.trim());
  if (e.setLabel && e.setId !== "all") parts.push(e.setLabel);
  if (e.cardNumber.trim()) parts.push(`#${e.cardNumber.trim()}`);
  return parts.join(" · ") || "Recent search";
};
