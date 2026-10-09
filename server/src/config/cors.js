const configuredOrigins = [process.env.CLIENT_URL, process.env.CLIENT_ORIGIN]
  .filter(Boolean)
  .flatMap((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean));

const allowOrigin = (origin, callback) => {
  if (!origin || configuredOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  // Allow any HTTP origin in development for local network testing (e.g., from a phone)
  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.') || origin.startsWith('http://172.')) {
      callback(null, true);
      return;
    }
  }

  callback(new Error('Origin is not allowed by CORS'));
};

module.exports = allowOrigin;