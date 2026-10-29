const request = require('supertest');
const app = require('../app');
const { makeUser } = require('./helpers');

test('does not advertise Express, and sets protective headers', async () => {
  const res = await request(app).get('/');

  expect(res.headers['x-powered-by']).toBeUndefined();
  expect(res.headers['x-content-type-options']).toBe('nosniff');
});

test('answers an unknown API path with JSON, not an HTML page', async () => {
  const res = await request(app).get('/api/nothing-here');

  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: 'Route not found' });
});

test('answers a broken JSON body with a clear 400', async () => {
  const res = await request(app)
    .post('/api/users/login')
    .set('Content-Type', 'application/json')
    .send('{ "email": ');

  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/not valid JSON/i);
});

test('locks sign-in after repeated failures, even for the right password', async () => {
  const user = await makeUser('student');
  let blocked = null;

  for (let i = 0; i < 12 && !blocked; i += 1) {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: user.email, password: 'wrong-password' });

    if (res.status === 429) blocked = res;
  }

  expect(blocked).not.toBeNull();
  expect(blocked.body.error).toMatch(/too many failed sign-in attempts/i);

  const rightPassword = await request(app)
    .post('/api/users/login')
    .send({ email: user.email, password: 'secret123' });
  expect(rightPassword.status).toBe(429);
});