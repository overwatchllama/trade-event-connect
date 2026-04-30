/**
 * Lightweight analytics shim for the card search dialog.
 *
 * No external SDK is wired up yet, so events are:
 *   1. logged to the console (visible in dev + Lovable preview)
 *   2. counted in localStorage so we can inspect totals later
 *   3. dispatched as a CustomEvent on `window` so any future provider
 *      (PostHog, GA, Segment, etc.) can subscribe without code changes here.
 *
 * Keep payloads small and PII-free.
 */

export type CardSearchEventName =
  // Fired every time a search runs in exact-only mode AND the user had typed a name
  // that we deliberately ignored. Lets us measure how often users lean on the
  // "name was disabled" recovery flows (notice button, empty-state CTA).
  | 'card_search.exact_disabled_name'
  // Fired when the user clicks one of the recovery affordances that turns exact mode off.
  | 'card_search.exact_recovery_clicked';

export interface CardSearchEventPayload {
  /** Which TCG catalog the search ran against. */
  game: 'pokemon' | 'mtg' | string;
  /** The name string that was ignored (truncated, lowercased — used for cardinality control). */
  ignoredName?: string;
  /** Where the recovery action was triggered from, when applicable. */
  source?: 'results-note' | 'empty-state' | 'toggle';
  /** Whether the user had also picked a set + entered a card #. */
  hadSet?: boolean;
  hadNumber?: boolean;
}

const COUNT_KEY_PREFIX = 'analytics:count:';

function bumpCounter(name: CardSearchEventName) {
  try {
    const key = `${COUNT_KEY_PREFIX}${name}`;
    const current = Number(window.localStorage.getItem(key) ?? '0');
    window.localStorage.setItem(key, String(current + 1));
  } catch {
    // ignore storage errors (private mode, quota)
  }
}

export function trackCardSearchEvent(
  name: CardSearchEventName,
  payload: CardSearchEventPayload,
): void {
  if (typeof window === 'undefined') return;

  // Sanitize the ignored name: lowercase + truncate to 40 chars to avoid storing long PII-ish strings.
  const safePayload: CardSearchEventPayload = {
    ...payload,
    ignoredName: payload.ignoredName?.toLowerCase().slice(0, 40),
  };

  // 1. Console log for live inspection.
  // eslint-disable-next-line no-console
  console.info('[analytics]', name, safePayload);

  // 2. Persist a simple counter so we can read totals from devtools / a debug panel later.
  bumpCounter(name);

  // 3. Broadcast for any future analytics provider to forward.
  try {
    window.dispatchEvent(
      new CustomEvent('card-search-analytics', { detail: { name, payload: safePayload } }),
    );
  } catch {
    // ignore — older browsers / SSR
  }
}

/** Read accumulated counters (handy for debugging or a future internal dashboard). */
export function getCardSearchEventCounts(): Record<CardSearchEventName, number> {
  const names: CardSearchEventName[] = [
    'card_search.exact_disabled_name',
    'card_search.exact_recovery_clicked',
  ];
  const out = {} as Record<CardSearchEventName, number>;
  for (const n of names) {
    try {
      out[n] = Number(window.localStorage.getItem(`${COUNT_KEY_PREFIX}${n}`) ?? '0');
    } catch {
      out[n] = 0;
    }
  }
  return out;
}
