import { Request, Response } from 'express';
import { SmsService } from '../core/SmsService';
import { SendSmsRequestSchema } from './validation';

/**
 * Thin HTTP adapter — translates HTTP <-> SmsService.
 * Holds NO business logic; everything meaningful lives in `SmsService`.
 */
export class SmsController {
  constructor(private readonly service: SmsService) {}

  send = async (req: Request, res: Response): Promise<void> => {
    const parsed = SendSmsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'ValidationError',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    const result = await this.service.send(parsed.data);
    if (result.success) {
      res.status(202).json({
        status: 'accepted',
        provider: result.provider,
        messageId: result.messageId,
      });
      return;
    }
    // Upstream failure — return 502 (bad gateway) so clients can distinguish
    // input errors (400) from provider errors.
    res.status(502).json({
      status: 'failed',
      provider: result.provider,
      error: result.error ?? 'Provider failed',
    });
  };
}
