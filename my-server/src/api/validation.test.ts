import { SendSmsRequestSchema } from './validation';

describe('SendSmsRequestSchema', () => {
  it('accepts a valid E.164 phone and non-empty message', () => {
    const r = SendSmsRequestSchema.safeParse({
      phoneNumber: '+96170123456',
      message: 'Hello',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a phone without + prefix', () => {
    const r = SendSmsRequestSchema.safeParse({
      phoneNumber: '96170123456',
      message: 'Hello',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an empty message', () => {
    const r = SendSmsRequestSchema.safeParse({
      phoneNumber: '+96170123456',
      message: '   ',
    });
    expect(r.success).toBe(false);
  });

  it('rejects messages longer than 1600 chars', () => {
    const r = SendSmsRequestSchema.safeParse({
      phoneNumber: '+96170123456',
      message: 'a'.repeat(1601),
    });
    expect(r.success).toBe(false);
  });
});
