import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database/sqlite.js';

export async function makeTestApp() {
  const database = await createDatabase({ filePath: null, reset: true, seed: true });
  return createApp({ database, rateLimit: 9999, authRateLimit: 9999 });
}

export async function loginAs(app, email, password) {
  const request = (await import('supertest')).default;
  const response = await request(app).post('/api/auth/login').send({ email, password });
  if (response.statusCode !== 200) throw new Error(`Login failed for ${email}: ${response.statusCode}`);
  return response.body.token;
}
