import { HttpClient, HttpError, TimeoutError } from '../core/HttpClient';
import { SendSmsInput, SendSmsResult, SmsProvider } from './SmsProvider';

/**
 * Adapter for the external Provider A endpoint:
 *   POST {baseUrl}/provider-a/send  body: { phoneNumber, message }
 *
 * Translates the provider-specific request/response into the application's
 * neutral `SendSmsResult`.
 */
export class ProviderASmsProvider implements SmsProvider {
  public readonly name = 'provider-a';

  constructor(private readonly http: HttpClient, private readonly baseUrl: string) {}

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const url = `${this.baseUrl}/provider-a/send`;
    try {
      const res = await this.http.request<{ status: string; messageId?: string; error?: string }>(
        url,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phoneNumber: input.phoneNumber, message: input.message }),
        },
      );

      const ok = res.body?.status === 'sent';
      return {
        success: ok,
        provider: this.name,
        status: res.status,
        messageId: res.body?.messageId,
        error: ok ? undefined : res.body?.error ?? 'Unexpected response',
      };
    } catch (err) {
      return mapErrorToResult(this.name, err);
    }
  }
}

function mapErrorToResult(provider: string, err: unknown): SendSmsResult {
  if (err instanceof TimeoutError) {
    return { success: false, provider, error: `timeout after ${err.timeoutMs}ms` };
  }
  if (err instanceof HttpError) {
    return { success: false, provider, status: err.status, error: `http ${err.status}` };
  }
  const message = err instanceof Error ? err.message : 'unknown error';
  return { success: false, provider, error: message };
}
