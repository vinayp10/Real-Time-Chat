const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync(req.body);
    return next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: error.errors
    });
  }
};

module.exports = validate;
