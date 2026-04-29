import { z } from 'zod';

/**
 * Input contract for `POST /sms/send`.
 *
 * Phone number validation uses E.164: a leading "+" and 8–15 digits.
 * That's the format all real SMS providers expect and matches the spec
 * examples (e.g. +96170123456).
 */
export const SendSmsRequestSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'phoneNumber must be E.164 format, e.g. +96170123456'),
  message: z
    .string()
    .trim()
    .min(1, 'message must not be empty')
    .max(1600, 'message must be at most 1600 characters'),
});

export type SendSmsRequest = z.infer<typeof SendSmsRequestSchema>;
