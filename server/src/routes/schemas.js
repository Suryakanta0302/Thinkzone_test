import Joi from 'joi';

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

export const schoolQuerySchema = Joi.object({
  districtCode: Joi.string().trim().max(40),
  blockCode: Joi.string().trim().max(40),
  clusterCode: Joi.string().trim().max(40),
  includeLocationCodes: Joi.boolean().default(false),
  search: Joi.string().trim().max(120).allow(''),
  ...pagination,
});

export const createVisitSchema = Joi.object({
  clientId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
  captureMode: Joi.string().valid('online', 'offline').default('online'),
  userId: Joi.string().valid('U1001', 'U1002', 'U1003').required(),
  udiseCode: Joi.string().trim().min(1).max(32).required(),
  visitedAt: Joi.date().iso().required(),
  answers: Joi.array().items(Joi.object({
    questionId: Joi.string().trim().min(1).max(80).required(),
    value: Joi.any().required(),
  }).unknown(false)).required(),
}).unknown(false);

export const visitsQuerySchema = Joi.object({
  userId: Joi.string().valid('U1001', 'U1002', 'U1003').required(),
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().min(2000).max(2200),
  ...pagination,
});

export const reportQuerySchema = Joi.object({
  districtCode: Joi.string().trim().min(1).max(40).required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2200).required(),
});
