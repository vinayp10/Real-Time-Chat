// These tests never touch the database: they cover routes that answer
// before any DB call (health, 404, auth guard, request validation).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('unknown API route returns 404 JSON', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.message, 'Route not found');
});

test('protected routes return 401 without a token', async () => {
  for (const path of ['/api/users/search', '/api/conversations', '/api/messages/abc', '/api/auth/me']) {
    const res = await request(app).get(path);
    assert.equal(res.status, 401, `${path} should be protected`);
  }
});

test('protected route rejects a garbage token', async () => {
  const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
  assert.equal(res.status, 401);
});

test('POST /api/auth/register rejects an invalid body with 400', async () => {
  const res = await request(app).post('/api/auth/register').send({ username: 'a', email: 'bad' });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Validation failed');
});

test('POST /api/auth/login rejects an invalid body with 400', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
  assert.equal(res.status, 400);
});

test('security headers are set by helmet', async () => {
  const res = await request(app).get('/api/health');
  assert.ok(res.headers['x-content-type-options']);
});

test('requests from a blocked origin get 403', async () => {
  const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.org');
  assert.equal(res.status, 403);
});
