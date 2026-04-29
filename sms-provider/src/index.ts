import { createApp } from './app';
import { config } from './config';

const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[sms-provider] listening on :${config.port} (failureRate=${config.failureRate})`);
});

const shutdown = (signal: string) => () => {
  // eslint-disable-next-line no-console
  console.log(`[sms-provider] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));
