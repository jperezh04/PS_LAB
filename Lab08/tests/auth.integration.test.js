import request from 'supertest';
import { describe, expect, it, beforeEach } from '@jest/globals';
import { makeTestApp } from './testApp.js';

let app;
beforeEach(async () => { app = await makeTestApp(); });

describe('Auth integration flow', () => {
  it('registers a customer, then uses generated JWT to read /auth/me', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ username: 'qa_player', email: 'qa.player@aether.dev', password: 'Player1234' });

    expect(register.statusCode).toBe(201);
    expect(register.body.user.email).toBe('qa.player@aether.dev');
    expect(register.body.token).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${register.body.token}`);

    expect(me.statusCode).toBe(200);
    expect(me.body.user.username).toBe('qa_player');
  });

  it('rejects invalid login credentials with 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex@aether.dev', password: 'wrong-password' });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid credentials.');
  });
});
