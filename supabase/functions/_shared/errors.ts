/**
 * Shared error utilities for edge functions.
 *
 * Edge function `catch` blocks receive `unknown`. Use these helpers to
 * safely extract a string message and a stable error type/name without
 * leaking internal stack traces or producing `[object Object]`.
 */

export interface NormalizedError {
  message: string;
  errorType: string;
}

/**
 * Convert an unknown thrown value to a human-readable string.
 */
export function errorToMessage(error: unknown, fallback = "An unknown error occurred"): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) return maybeMessage;
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Normalize an unknown thrown value into `{ message, errorType }` suitable
 * for a typed JSON error response.
 */
export function normalizeError(error: unknown, defaultType = "EdgeFunctionError"): NormalizedError {
  return {
    message: errorToMessage(error),
    errorType: error instanceof Error && error.name ? error.name : defaultType,
  };
}
