/**
 * OpenAPI 3.0 spec for the simulated external SMS provider service.
 * Documents both heterogeneous endpoints (Provider A — POST, Provider B — GET).
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SMSProvider — Simulated External Providers',
    version: '1.0.0',
    description:
      'Simulates two external SMS providers with deliberately different request signatures and random failures.',
  },
  servers: [{ url: 'http://localhost:4001', description: 'Local' }],
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
    '/provider-a/send': {
      post: {
        summary: 'Provider A — send SMS via JSON body',
        tags: ['provider-a'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProviderARequest' },
              examples: {
                example: { value: { phoneNumber: '+96170123456', message: 'Hello' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'SMS accepted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProviderASuccess' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProviderAError' },
              },
            },
          },
          '502': {
            description: 'Simulated upstream failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProviderAError' },
              },
            },
          },
        },
      },
    },
    '/provider-b/send': {
      get: {
        summary: 'Provider B — send SMS via query string',
        tags: ['provider-b'],
        parameters: [
          {
            name: 'to',
            in: 'query',
            required: true,
            schema: { type: 'string', example: '+96170123456' },
            description: 'Recipient phone number (E.164)',
          },
          {
            name: 'text',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'Hello' },
            description: 'Message body',
          },
        ],
        responses: {
          '200': {
            description: 'SMS accepted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProviderBSuccess' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProviderBError' },
              },
            },
          },
          '502': {
            description: 'Simulated upstream failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProviderBError' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ProviderARequest: {
        type: 'object',
        required: ['phoneNumber', 'message'],
        properties: {
          phoneNumber: { type: 'string', example: '+96170123456' },
          message: { type: 'string', example: 'Hello' },
        },
      },
      ProviderASuccess: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'sent' },
          messageId: { type: 'string' },
        },
      },
      ProviderAError: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'failed' },
          error: { type: 'string' },
        },
      },
      ProviderBSuccess: {
        type: 'object',
        properties: {
          result: { type: 'string', example: 'success' },
          id: { type: 'string' },
        },
      },
      ProviderBError: {
        type: 'object',
        properties: {
          result: { type: 'string', example: 'failure' },
          reason: { type: 'string' },
        },
      },
    },
  },
} as const;
