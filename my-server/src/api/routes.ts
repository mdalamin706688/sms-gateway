import { Router } from 'express';
import { SmsController } from './SmsController';

export function buildSmsRouter(controller: SmsController): Router {
  const router = Router();
  router.post('/send', controller.send);
  return router;
}
