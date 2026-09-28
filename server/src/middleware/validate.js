export function validate(schema, property = 'query') {
  return (request, _response, next) => {
    const { error, value } = schema.validate(request[property], {
      abortEarly: false,
      convert: true,
      stripUnknown: false,
    });
    if (error) {
      const details = error.details.map((detail) => detail.message).join('; ');
      const validationError = new Error(details);
      validationError.status = 400;
      validationError.code = 'VALIDATION_ERROR';
      return next(validationError);
    }
    request[property] = value;
    next();
  };
}
