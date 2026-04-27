/**
 * Shared error utilities for edge functions.
 *
 * All edge functions should:
 *   1. Generate a `requestId` at the start with `newRequestId()`.
 *   2. Throw `HttpError` (or any Error whose `name` is in {@link DEFAULT_ERROR_STATUS_MAP})
 *      from any known failure path.
 *   3. In the catch block call `errorResponse(error, { requestId, headers: corsHeaders })`.
 *
 * The response body shape is always:
 *   { success: false, error: string, errorType: string, requestId: string }
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
 * Typed error class. Throw one of these from any handler so the shared
 * `errorResponse` helper can map it to the correct HTTP status.
 *
 * Usage:
 *   throw new HttpError("MissingFields", "orderId is required", 400);
 */
export class HttpError extends Error {
  status: number;
  constructor(name: string, message: string, status: number) {
    super(message);
    this.name = name;
    this.status = status;
  }
}

/**
 * Default name -> status map. Functions can extend this with their own map
 * passed to `errorResponse({ statusMap })`. Unknown names default to 500.
 */
export const DEFAULT_ERROR_STATUS_MAP: Record<string, number> = {
  // Auth / authz
  MissingAuthHeader: 401,
  Unauthorized: 401,
  Forbidden: 403,
  AdminRequired: 403,

  // Input validation
  InvalidJson: 400,
  MissingFields: 400,
  InvalidInput: 400,
  ValidationError: 400,
  InvalidQuantity: 422,
  InvalidUnitPrice: 422,
  InvalidEmail: 400,
  InvalidUrl: 400,
  UrlNotAllowed: 400,

  // Resource state
  NotFound: 404,
  Conflict: 409,
  AlreadyCheckedIn: 409,
  NotCheckedIn: 409,
  MethodNotAllowed: 405,

  // Rate limiting / quota
  RateLimited: 429,
  PaymentRequired: 402,

  // Server / upstream
  ConfigError: 500,
  StripeConfigError: 500,
  ResendConfigError: 500,
  DatabaseError: 500,
  OrderUpdateError: 500,
  StripeCustomerError: 502,
  StripeSessionError: 502,
  UpstreamError: 502,
};

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
 * Resolve an HTTP status for the given error.
 * Order of precedence:
 *   1. `HttpError.status`
 *   2. Per-call `statusMap[error.name]`
 *   3. `DEFAULT_ERROR_STATUS_MAP[error.name]`
 *   4. Caller-provided fallback `status` (defaults to 500)
 */
export function statusForError(
  error: unknown,
  options: { statusMap?: Record<string, number>; status?: number } = {},
): number {
  if (error instanceof HttpError) return error.status;
  if (error instanceof Error && error.name) {
    if (options.statusMap && options.statusMap[error.name]) return options.statusMap[error.name];
    if (DEFAULT_ERROR_STATUS_MAP[error.name]) return DEFAULT_ERROR_STATUS_MAP[error.name];
  }
  return options.status ?? 500;
}

/**
 * Build a full `Response` with the canonical error body and CORS-friendly headers.
 *
 * Status resolution: HttpError.status -> statusMap -> DEFAULT_ERROR_STATUS_MAP -> options.status (default 500).
 * Pass an explicit `status` to override the fallback when the error is unknown.
 */
export function errorResponse(
  error: unknown,
  options: {
    status?: number;
    defaultType?: string;
    requestId?: string;
    headers?: Record<string, string>;
    statusMap?: Record<string, number>;
  } = {},
): Response {
  const { defaultType, requestId, headers = {}, statusMap, status: fallbackStatus } = options;
  const status = statusForError(error, { statusMap, status: fallbackStatus });
  const body = buildErrorBody(error, defaultType, requestId);
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
