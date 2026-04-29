import { Router, Request, Response } from 'express';
import { simulateSend } from '../simulator';

/**
 * Provider A — POST /provider-a/send
 * Body: { phoneNumber: string, message: string }
 */
export const providerARouter = Router();

providerARouter.post('/send', async (req: Request, res: Response) => {
  const { phoneNumber, message } = req.body ?? {};

  if (typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
    return res.status(400).json({ status: 'error', error: 'phoneNumber is required' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ status: 'error', error: 'message is required' });
  }

  const result = await simulateSend();
  if (!result.ok) {
    return res.status(502).json({ status: 'failed', error: result.error });
  }
  return res.status(200).json({ status: 'sent', messageId: result.messageId });
});
