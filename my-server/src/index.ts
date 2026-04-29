import { config } from './config';
import { createApp } from './app';
import { HttpClient } from './core/HttpClient';
import { SmsService } from './core/SmsService';
import { ProviderASmsProvider } from './providers/ProviderASmsProvider';
import { ProviderBSmsProvider } from './providers/ProviderBSmsProvider';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { RandomProviderSelector } from './providers/ProviderSelector';
import { SmsController } from './api/SmsController';
import { FileLogger } from './logging/FileLogger';
import { ConsoleLogger } from './logging/ConsoleLogger';
import { CompositeLogger } from './logging/Logger';
import { StatsCollector } from './stats/StatsCollector';
import { StatsCronJob } from './stats/StatsCronJob';

/**
 * Composition root.
 *
 * The ONLY place where concrete classes are wired together. Everywhere else
 * code depends on interfaces. This is what makes the system extensible:
 * adding a new provider = one new class + one new line below.
 */
function bootstrap() {
  const fileLogger = new FileLogger(config.logFilePath);
  const logger = new CompositeLogger([fileLogger, new ConsoleLogger()]);

  const http = new HttpClient({ timeoutMs: config.requestTimeoutMs });

  const registry = new ProviderRegistry();
  registry.register(new ProviderASmsProvider(http, config.smsProviderBaseUrl));
  registry.register(new ProviderBSmsProvider(http, config.smsProviderBaseUrl));
  // To add a new provider in the future:
  //   registry.register(new MyNewProvider(http, '...'));

  const selector = new RandomProviderSelector(registry);
  const stats = new StatsCollector();
  const smsService = new SmsService(selector, logger, stats, config.retry);
  const smsController = new SmsController(smsService);

  const app = createApp({ smsController, logger });
  const server = app.listen(config.port, () => {
    logger.info('my_server_started', {
      port: config.port,
      smsProviderBaseUrl: config.smsProviderBaseUrl,
      providers: registry.all().map((p) => p.name),
    });
  });

  const cronJob = new StatsCronJob(
    config.stats.cronExpression,
    config.stats.targetPhoneNumber,
    stats,
    smsService,
    logger,
  );
  if (config.stats.enabled) cronJob.start();

  const shutdown = (signal: string) => async () => {
    logger.info('shutdown_signal', { signal });
    cronJob.stop();
    server.close(async () => {
      await fileLogger.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));

  // Catch-all guards so the process never dies unexpectedly.
  process.on('uncaughtException', (err) => {
    logger.error('uncaught_exception', { message: err.message, stack: err.stack });
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled_rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

bootstrap();
