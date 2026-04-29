import { Router, Request, Response } from 'express';
import { simulateSend } from '../simulator';

/**
 * Provider B — GET /provider-b/send?to=...&text=...
 * Different signature from Provider A on purpose, to force the consumer
 * to abstract over heterogeneous providers.
 */
export const providerBRouter = Router();

providerBRouter.get('/send', async (req: Request, res: Response) => {
  const to = typeof req.query.to === 'string' ? req.query.to : '';
  const text = typeof req.query.text === 'string' ? req.query.text : '';

  if (!to.trim()) {
    return res.status(400).json({ result: 'error', reason: 'query "to" is required' });
  }
  if (!text.trim()) {
    return res.status(400).json({ result: 'error', reason: 'query "text" is required' });
  }

  const result = await simulateSend();
  if (!result.ok) {
    return res.status(502).json({ result: 'failure', reason: result.error });
  }
  return res.status(200).json({ result: 'success', id: result.messageId });
});
