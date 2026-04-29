/**
 * Minimal hand-written OpenAPI 3.0 spec for MyServer.
 * Kept inline (not generated) to avoid extra build steps and to keep the
 * contract reviewable in one place.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MyServer — SMS Gateway API',
    version: '1.0.0',
    description:
      'Main SMS gateway. Picks an upstream provider at random, retries with exponential backoff, and fails over between providers.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local' }],
  paths: {
    '/health': {
      get: {
        summary: 'Liveness probe',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { status: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    '/sms/send': {
      post: {
        summary: 'Send an SMS through a randomly selected upstream provider',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SendSmsRequest' },
              examples: {
                valid: {
                  value: { phoneNumber: '+96170123456', message: 'Hello from MyServer' },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Accepted by an upstream provider',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SendSmsAccepted' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '502': {
            description: 'All providers failed after retries',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SendSmsFailed' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      SendSmsRequest: {
        type: 'object',
        required: ['phoneNumber', 'message'],
        properties: {
          phoneNumber: {
            type: 'string',
            description: 'E.164 phone number',
            example: '+96170123456',
            pattern: '^\\+[1-9]\\d{7,14}$',
          },
          message: {
            type: 'string',
            minLength: 1,
            maxLength: 1600,
            example: 'Hello from MyServer',
          },
        },
      },
      SendSmsAccepted: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'accepted' },
          provider: { type: 'string', example: 'provider-a' },
          messageId: { type: 'string' },
        },
      },
      SendSmsFailed: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'failed' },
          provider: { type: 'string', example: 'provider-b' },
          error: { type: 'string', example: 'timeout after 3000ms' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'ValidationError' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
} as const;
