const test = require('node:test');
const assert = require('node:assert/strict');

function loadCors(env) {
  Object.assign(process.env, env);
  delete require.cache[require.resolve('../src/config/cors')];
  return require('../src/config/cors');
}

function check(allowOrigin, origin) {
  return new Promise((resolve) => allowOrigin(origin, (err, ok) => resolve({ err, ok })));
}

test('allows requests with no origin (curl, server-to-server)', async () => {
  const allow = loadCors({ NODE_ENV: 'development', CLIENT_URL: 'https://chat.example.com' });
  assert.equal((await check(allow, undefined)).ok, true);
});

test('allows the configured CLIENT_URL', async () => {
  const allow = loadCors({ NODE_ENV: 'production', CLIENT_URL: 'https://chat.example.com' });
  assert.equal((await check(allow, 'https://chat.example.com')).ok, true);
});

test('blocks unknown origins with a 403 error', async () => {
  const allow = loadCors({ NODE_ENV: 'production', CLIENT_URL: 'https://chat.example.com' });
  const { err } = await check(allow, 'https://evil.example.org');
  assert.equal(err.status, 403);
});

test('allows localhost only outside production', async () => {
  const dev = loadCors({ NODE_ENV: 'development', CLIENT_URL: 'https://chat.example.com' });
  assert.equal((await check(dev, 'http://localhost:5173')).ok, true);
  const prod = loadCors({ NODE_ENV: 'production', CLIENT_URL: 'https://chat.example.com' });
  assert.equal((await check(prod, 'http://localhost:5173')).err.status, 403);
});
