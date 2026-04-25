/**
 * Minimal Resend HTTP client.
 *
 * The official `resend` npm SDK does not resolve in this edge runtime,
 * so we call the public REST API directly. Only the small surface area
 * we actually use is exposed.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

export interface ResendEmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
}

export interface ResendSuccessResponse {
  id: string;
  [key: string]: unknown;
}

export interface ResendErrorResponse {
  name?: string;
  message?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export async function sendResendEmail(
  apiKey: string | undefined,
  payload: ResendEmailPayload,
): Promise<{ data: ResendSuccessResponse | null; error: ResendErrorResponse | null }> {
  if (!apiKey) {
    return {
      data: null,
      error: { name: "missing_api_key", message: "RESEND_API_KEY is not configured" },
    };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      data: null,
      error: (body as ResendErrorResponse) ?? {
        message: `Resend request failed with status ${response.status}`,
        statusCode: response.status,
      },
    };
  }

  return { data: (body as ResendSuccessResponse) ?? { id: "" }, error: null };
}

/**
 * Drop-in shim that mimics the tiny slice of `resend.emails.send(...)`
 * that the existing edge functions use. Lets us swap out the npm SDK
 * without touching call sites.
 */
export function createResendClient(apiKey: string | undefined) {
  return {
    emails: {
      send: (payload: ResendEmailPayload) => sendResendEmail(apiKey, payload),
    },
  };
}
