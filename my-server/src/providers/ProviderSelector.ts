import { SmsProvider } from './SmsProvider';
import { ProviderRegistry } from './ProviderRegistry';

/**
 * Strategy interface for picking a provider for a given send.
 *
 * Decoupling selection from execution lets us swap policies (random,
 * weighted, round-robin, health-based) without touching SmsService.
 */
export interface ProviderSelector {
  /** @param exclude providers to skip (e.g. those that just failed). */
  pick(exclude?: ReadonlySet<string>): SmsProvider | undefined;
}

/**
 * Random uniform selector — required by the spec ("randomly choose between
 * Provider A and Provider B for each request").
 */
export class RandomProviderSelector implements ProviderSelector {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly rand: () => number = Math.random,
  ) {}

  pick(exclude: ReadonlySet<string> = new Set()): SmsProvider | undefined {
    const candidates = this.registry.all().filter((p) => !exclude.has(p.name));
    if (candidates.length === 0) return undefined;
    const idx = Math.floor(this.rand() * candidates.length);
    return candidates[idx];
  }
}
