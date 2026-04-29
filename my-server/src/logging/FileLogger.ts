import { promises as fsp, createWriteStream, WriteStream, mkdirSync } from 'fs';
import * as path from 'path';
import { BaseLogger, LogLevel, LogRecord } from './Logger';

/**
 * Structured JSON-lines file logger.
 *
 * Uses a single append stream so we don't open/close a file descriptor on
 * every write. Each record is one line of JSON — easy to grep, parse, ship
 * to any log aggregator later.
 */
export class FileLogger extends BaseLogger {
  private stream: WriteStream;

  constructor(private readonly filePath: string) {
    super();
    mkdirSync(path.dirname(filePath), { recursive: true });
    this.stream = createWriteStream(filePath, { flags: 'a' });
    this.stream.on('error', (err) => {
      // Last-resort: never throw inside the logger.
      // eslint-disable-next-line no-console
      console.error('[file-logger] stream error:', err);
    });
  }

  log(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
    const record: LogRecord = {
      ...meta,
      level,
      message,
      timestamp: new Date().toISOString(),
    };
    try {
      this.stream.write(JSON.stringify(record) + '\n');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[file-logger] failed to write:', err);
    }
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => this.stream.end(resolve));
  }

  /** Convenience for tests. */
  static async readAll(filePath: string): Promise<string> {
    return fsp.readFile(filePath, 'utf8');
  }
}
