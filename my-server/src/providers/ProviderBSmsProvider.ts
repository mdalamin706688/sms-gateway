import { HttpClient, HttpError, TimeoutError } from '../core/HttpClient';
import { SendSmsInput, SendSmsResult, SmsProvider } from './SmsProvider';

/**
 * Adapter for Provider B:
 *   GET {baseUrl}/provider-b/send?to=...&text=...
 *
 * Note that the wire signature differs from Provider A — that's exactly the
 * point of the abstraction: callers don't care.
 */
export class ProviderBSmsProvider implements SmsProvider {
  public readonly name = 'provider-b';

  constructor(private readonly http: HttpClient, private readonly baseUrl: string) {}

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const url =
      `${this.baseUrl}/provider-b/send` +
      `?to=${encodeURIComponent(input.phoneNumber)}` +
      `&text=${encodeURIComponent(input.message)}`;

    try {
      const res = await this.http.request<{ result: string; id?: string; reason?: string }>(url, {
        method: 'GET',
      });
      const ok = res.body?.result === 'success';
      return {
        success: ok,
        provider: this.name,
        status: res.status,
        messageId: res.body?.id,
        error: ok ? undefined : res.body?.reason ?? 'Unexpected response',
      };
    } catch (err) {
      if (err instanceof TimeoutError) {
        return { success: false, provider: this.name, error: `timeout after ${err.timeoutMs}ms` };
      }
      if (err instanceof HttpError) {
        return { success: false, provider: this.name, status: err.status, error: `http ${err.status}` };
      }
      const message = err instanceof Error ? err.message : 'unknown error';
      return { success: false, provider: this.name, error: message };
    }
  }
}
