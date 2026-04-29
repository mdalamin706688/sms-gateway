/**
 * Provider abstraction.
 *
 * Each external SMS provider (Provider A, Provider B, future ones) implements
 * this interface. The rest of the application depends ONLY on this interface,
 * not on transport details (HTTP method, query vs body, response shape).
 *
 * To add a new provider:
 *   1. Create a class implementing `SmsProvider`.
 *   2. Register it in `ProviderRegistry`.
 * No other code needs to change.
 */

export interface SendSmsInput {
  phoneNumber: string;
  message: string;
}

export interface SendSmsResult {
  /** Provider-agnostic success flag. */
  success: boolean;
  /** Provider name for logging / stats. */
  provider: string;
  /** Underlying response status (HTTP code, when applicable). */
  status?: number;
  /** Provider message id, if returned. */
  messageId?: string;
  /** Human readable error if `success === false`. */
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(input: SendSmsInput): Promise<SendSmsResult>;
}
