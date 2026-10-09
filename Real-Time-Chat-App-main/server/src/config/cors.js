const configuredOrigins = [process.env.CLIENT_URL, process.env.CLIENT_ORIGIN]
  .filter(Boolean)
  .flatMap((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean));

const allowOrigin = (origin, callback) => {
  if (!origin || configuredOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.protocol === 'http:'
        && ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname)) {
        callback(null, true);
        return;
      }
    } catch (error) {
      const invalid = new Error('Invalid request origin');
      invalid.status = 400;
      callback(invalid);
      return;
    }
  }

  const error = new Error('Origin is not allowed by CORS');
  error.status = 403;
  callback(error);
};

module.exports = allowOrigin;