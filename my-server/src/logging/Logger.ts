/**
 * Logger abstraction — keeps the rest of the code free from any specific
 * logging library or sink. Two sinks are provided out of the box:
 *   - `FileLogger`    : structured JSON lines written to disk (required)
 *   - `ConsoleLogger` : process stdout, useful in dev / tests
 *
 * `CompositeLogger` lets us fan out to several sinks at once.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogRecord {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface Logger {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export abstract class BaseLogger implements Logger {
  abstract log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }
  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }
}

export class CompositeLogger extends BaseLogger {
  constructor(private readonly sinks: Logger[]) {
    super();
  }
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    for (const sink of this.sinks) sink.log(level, message, meta);
  }
}
