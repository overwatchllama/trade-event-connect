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

export interface ErrorResponseBody {
  success: false;
  error: string;
  errorType: string;
  requestId: string;
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
 * Normalize an unknown thrown value into `{ message, errorType }`.
 */
export function normalizeError(error: unknown, defaultType = "EdgeFunctionError"): NormalizedError {
  return {
    message: errorToMessage(error),
    errorType: error instanceof Error && error.name ? error.name : defaultType,
  };
}

/**
 * Generate a short request ID for correlating logs to client-visible errors.
 */
export function newRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Build the canonical edge function error response body.
 * All checkout-related functions MUST return this exact shape on failure.
 */
export function buildErrorBody(
  error: unknown,
  defaultType = "EdgeFunctionError",
  requestId: string = newRequestId(),
): ErrorResponseBody {
  const { message, errorType } = normalizeError(error, defaultType);
  return { success: false, error: message, errorType, requestId };
}

/**
 * Convenience: build a full `Response` with the standard error body
 * and CORS-friendly headers. Defaults to HTTP 400.
 */
export function errorResponse(
  error: unknown,
  options: {
    status?: number;
    defaultType?: string;
    requestId?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const { status = 400, defaultType, requestId, headers = {} } = options;
  const body = buildErrorBody(error, defaultType, requestId);
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
