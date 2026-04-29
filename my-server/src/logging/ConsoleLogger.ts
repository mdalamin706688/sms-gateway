import { BaseLogger, LogLevel } from './Logger';

export class ConsoleLogger extends BaseLogger {
  log(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
    const payload = { ...meta, level, message, timestamp: new Date().toISOString() };
    const line = JSON.stringify(payload);
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(line);
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(line);
    } else {
      // eslint-disable-next-line no-console
      console.log(line);
    }
  }
}
