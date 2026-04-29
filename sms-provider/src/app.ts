import express, { Application, Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { providerARouter } from './routes/providerA';
import { providerBRouter } from './routes/providerB';
import { openApiSpec } from './openapi';

export function createApp(): Application {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/provider-a', providerARouter);
  app.use('/provider-b', providerBRouter);

  // OpenAPI spec + Swagger UI
  app.get('/openapi.json', (_req, res) => res.json(openApiSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

  // Error guard so the service never crashes on a request.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[sms-provider] unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
