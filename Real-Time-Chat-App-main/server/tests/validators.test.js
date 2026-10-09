const test = require('node:test');
const assert = require('node:assert/strict');
const { registerSchema, loginSchema } = require('../src/validators/auth.validator');
const { sendMessageSchema } = require('../src/validators/message.validator');

const validRegister = {
  username: 'vinay_01',
  email: 'vinay@example.com',
  password: 'secret123',
  displayName: 'Vinay',
};

test('registerSchema accepts a valid body', () => {
  assert.equal(registerSchema.safeParse(validRegister).success, true);
});

test('registerSchema rejects a short or invalid username', () => {
  assert.equal(registerSchema.safeParse({ ...validRegister, username: 'ab' }).success, false);
  assert.equal(registerSchema.safeParse({ ...validRegister, username: 'bad name!' }).success, false);
});

test('registerSchema rejects a bad email and a short password', () => {
  assert.equal(registerSchema.safeParse({ ...validRegister, email: 'not-an-email' }).success, false);
  assert.equal(registerSchema.safeParse({ ...validRegister, password: '123' }).success, false);
});

test('loginSchema needs a valid email and a password', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'nope', password: 'x' }).success, false);
});

test('sendMessageSchema requires ciphertext and iv, and defaults type to text', () => {
  const ok = sendMessageSchema.safeParse({ ciphertext: 'abc', iv: 'def' });
  assert.equal(ok.success, true);
  assert.equal(ok.data.type, 'text');
  assert.equal(sendMessageSchema.safeParse({ ciphertext: '', iv: 'def' }).success, false);
  assert.equal(sendMessageSchema.safeParse({ ciphertext: 'abc' }).success, false);
});

test('sendMessageSchema rejects unknown message types', () => {
  assert.equal(sendMessageSchema.safeParse({ ciphertext: 'a', iv: 'b', type: 'video' }).success, false);
});
