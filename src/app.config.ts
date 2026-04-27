import * as Joi from 'joi';

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongoUrl: process.env.MONGO_URL,
  redisUrl: process.env.REDIS_URL,
  musicBrainz: {
    baseUrl: process.env.MUSICBRAINZ_BASE_URL ?? 'https://musicbrainz.org/ws/2',
    timeoutMs: parseInt(process.env.MB_TIMEOUT_MS ?? '5000', 10),
  },
  cache: {
    recordListTtlMs: parseInt(
      process.env.RECORD_LIST_CACHE_TTL_MS ?? '60000',
      10,
    ),
  },
});

export const validationSchema = Joi.object({
  MONGO_URL: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  PORT: Joi.number().port().default(3000),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  MUSICBRAINZ_BASE_URL: Joi.string()
    .uri()
    .default('https://musicbrainz.org/ws/2'),
  MB_TIMEOUT_MS: Joi.number().integer().min(100).default(5000),
  RECORD_LIST_CACHE_TTL_MS: Joi.number().integer().min(1000).default(60000),
});
