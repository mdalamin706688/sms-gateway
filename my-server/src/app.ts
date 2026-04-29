import express, { Application, NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { SmsController } from './api/SmsController';
import { buildSmsRouter } from './api/routes';
import { openApiSpec } from './api/openapi';
import { Logger } from './logging/Logger';

export interface AppDeps {
  smsController: SmsController;
  logger: Logger;
}

export function createApp(deps: AppDeps): Application {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/sms', buildSmsRouter(deps.smsController));

  // OpenAPI spec + Swagger UI
  app.get('/openapi.json', (_req, res) => res.json(openApiSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

  // Last-resort error handler: log + 500. Service stays alive.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    deps.logger.error('unhandled_error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
