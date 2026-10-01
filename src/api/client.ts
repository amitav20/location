/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Low-level calls to the Laravel API (/api/v1). The website signs in with Laravel Sanctum's session
// cookie: the dev server forwards /api and /sanctum to Laravel, so the browser sees one site.
// Every change (POST/PUT/PATCH/DELETE) carries the X-XSRF-TOKEN header Laravel uses against CSRF.

export const API_BASE = '/api/v1';

/** An error from the API, with the message to show and, for validation errors, the per-field messages. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

// The app registers this so an ended session (signed out elsewhere, banned...) returns to the sign-in page
let onUnauthorized: (() => void) | null = null;
let signedIn = false;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function setSignedIn(value: boolean) {
  signedIn = value;
}

export function isSignedIn() {
  return signedIn;
}

function readCookie(name: string): string {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

/** Makes sure the XSRF-TOKEN cookie exists (Laravel sets it on this call). */
async function ensureCsrfCookie(force = false) {
  if (!force && readCookie('XSRF-TOKEN')) return;
  await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
}

function buildUrl(path: string, query?: Query) {
  const url = path.startsWith('/') ? path : `${API_BASE}/${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/** Turns Laravel's error JSON ({message, errors: {field: [..]}}) into an ApiError. */
function toApiError(status: number, data: any): ApiError {
  const fieldErrors: Record<string, string> = {};
  if (data?.errors && typeof data.errors === 'object') {
    Object.entries(data.errors).forEach(([field, messages]) => {
      if (Array.isArray(messages) && messages.length) fieldErrors[field] = String(messages[0]);
    });
  }
  const firstFieldError = Object.values(fieldErrors)[0];
  const fallback =
    status === 403
      ? "You don't have permission to do that."
      : status === 404
        ? 'That could not be found. It may have been removed.'
        : status === 419
          ? 'Your session expired. Please try again.'
          : status === 429
            ? 'Too many attempts. Please wait a moment and try again.'
            : status >= 500
              ? 'Something went wrong on the server. Please try again.'
              : `Request failed (${status}).`;
  // Laravel's validation message adds "(and 2 more errors)"; the first field error reads better
  return new ApiError(firstFieldError || data?.message || fallback, status, fieldErrors);
}

async function send(path: string, options: RequestOptions | FormData, method: string, query?: Query): Promise<Response> {
  const isForm = options instanceof FormData;
  const body = isForm ? options : (options as RequestOptions).body;
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-XSRF-TOKEN'] = readCookie('XSRF-TOKEN');

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: 'same-origin',
      headers,
      body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and that the API is running.', 0);
  }
  return res;
}

/** Calls the API and returns the parsed JSON body (or null for empty responses). */
export async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  if (method !== 'GET') await ensureCsrfCookie();

  let res = await send(path, options, method, options.query);
  if (res.status === 419) {
    // The CSRF cookie expired: get a fresh one and try once more
    await ensureCsrfCookie(true);
    res = await send(path, options, method, options.query);
  }
  return handle<T>(res);
}

/** Multipart upload (files). */
export async function upload<T = any>(path: string, form: FormData): Promise<T> {
  await ensureCsrfCookie();
  let res = await send(path, form, 'POST');
  if (res.status === 419) {
    await ensureCsrfCookie(true);
    res = await send(path, form, 'POST');
  }
  return handle<T>(res);
}

async function handle<T>(res: Response): Promise<T> {
  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (res.status === 401 && signedIn) {
    signedIn = false;
    onUnauthorized?.();
  }
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}

/** Shorthand for the `data` key that every successful API response has. */
export async function getData<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const json = await request<{ data: T }>(path, options);
  return json?.data as T;
}

/** Signs in through Sanctum: the CSRF cookie must exist before the login POST. */
export async function startSession() {
  await ensureCsrfCookie(true);
}
