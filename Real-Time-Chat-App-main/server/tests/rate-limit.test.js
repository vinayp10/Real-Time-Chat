process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('login route is rate limited after 20 attempts', async () => {
  let last;
  for (let i = 0; i < 21; i += 1) {
    last = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
  }
  assert.equal(last.status, 429);
});
