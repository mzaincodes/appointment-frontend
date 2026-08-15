/**
 * HTTP client.
 *
 * Every network call in the app goes through `request`, which gives one place
 * to attach the auth token, unwrap the API envelope, and turn a failure into a
 * typed `ApiError` carrying the server's own patient-safe message. Components
 * therefore never touch `fetch`, never see the envelope, and always have a
 * message worth showing in a toast.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://appointment-backend-gz0d.onrender.com';

const TOKEN_KEY = 'bsds.token';

/**
 * The token lives in localStorage so a refreshed tab can restore its session.
 *
 * The trade-off — localStorage is readable by any script on the origin, so an
 * XSS bug would expose it — is recorded in the README. The backend also sets an
 * httpOnly cookie; a production build would move to that plus a refresh-token
 * rotation, which needs CSRF protection this prototype does not implement.
 */
export const tokenStorage = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null; // Safari private mode throws on localStorage access.
    }
  },
  set(token: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export interface FieldIssue {
  field: string;
  message: string;
}

/**
 * A failed API call.
 *
 * Carries the HTTP status, the backend's error code, and any per-field issues
 * so a form can highlight the offending input instead of only showing a banner.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level validation issues, keyed by field name. */
  get fieldErrors(): Record<string, string> {
    const issues = (this.details as { issues?: FieldIssue[] } | undefined)?.issues;
    if (!issues) return {};
    return Object.fromEntries(
      issues.map((issue) => [issue.field.replace(/^body\./, ''), issue.message]),
    );
  }

  /** Alternative times offered when a slot conflict occurs. */
  get alternatives(): string[] {
    return (this.details as { alternatives?: string[] } | undefined)?.alternatives ?? [];
  }

  get isSlotConflict(): boolean {
    return this.code === 'SLOT_UNAVAILABLE';
  }
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Send the stored token. Default true; disabled for public endpoints. */
  auth?: boolean;
  /** Aborts the request after this many ms. */
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, timeoutMs = 20_000, headers, ...rest } = options;

  const token = auth ? tokenStorage.get() : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    clearTimeout(timer);
    // A network-level failure never reaches the envelope, so it needs its own
    // message —"failed to fetch" tells a patient nothing.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'The request took too long. Please check your connection and try again.',
        0,
        'TIMEOUT',
      );
    }
    throw new ApiError(
      'Could not reach the clinic server. Please check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      'The server returned an unexpected response.',
      response.status,
      'BAD_RESPONSE',
    );
  }

  const envelope = payload as {
    success?: boolean;
    data?: T;
    message?: string;
    code?: string;
    details?: unknown;
  };

  if (!response.ok || envelope.success === false) {
    // An expired or revoked token should not leave the app in a half-signed-in
    // state; drop it so the next render shows the signed-out UI.
    if (response.status === 401 && auth && token) tokenStorage.clear();

    throw new ApiError(
      envelope.message ?? 'Something went wrong. Please try again.',
      response.status,
      envelope.code,
      envelope.details,
    );
  }

  return envelope.data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

/** Builds a query string, dropping empty values and expanding arrays. */
export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
