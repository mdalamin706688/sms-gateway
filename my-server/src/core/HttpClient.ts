/**
 * Thin HTTP client wrapping `fetch` with:
 *   - Configurable timeout via AbortController
 *   - Normalized error semantics (timeouts vs network vs HTTP errors)
 *
 * Kept tiny on purpose — providers should depend on a transport abstraction,
 * not on a heavy library. Easy to swap (axios, undici, etc.).
 */

export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly body?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}

export class TimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export interface HttpResponse<T> {
  status: number;
  body: T;
}

export interface HttpClientOptions {
  timeoutMs: number;
}

export class HttpClient {
  constructor(private readonly opts: HttpClientOptions) {}

  async request<T>(url: string, init: RequestInit = {}): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      let body: unknown = text;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        // leave as text
      }
      if (!res.ok) {
        throw new HttpError(res.status, `HTTP ${res.status}`, body);
      }
      return { status: res.status, body: body as T };
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        throw new TimeoutError(this.opts.timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
