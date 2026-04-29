import { SmsProvider } from './SmsProvider';

/**
 * In-memory registry of available providers.
 * The single place where new providers are wired up.
 */
export class ProviderRegistry {
  private readonly providers: SmsProvider[] = [];

  register(provider: SmsProvider): void {
    this.providers.push(provider);
  }

  all(): readonly SmsProvider[] {
    return this.providers;
  }

  size(): number {
    return this.providers.length;
  }
}
