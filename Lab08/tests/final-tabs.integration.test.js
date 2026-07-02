import request from 'supertest';
import { makeTestApp } from './testApp.js';

describe('Final navigation support endpoints', () => {
  test('creates support ticket without authentication for public support page', async () => {
    const app = await makeTestApp();

    const response = await request(app)
      .post('/api/support/tickets')
      .send({
        name: 'Visitor Tester',
        email: 'visitor@test.dev',
        topic: 'Checkout support',
        message: 'Necesito ayuda con un problema de checkout de prueba.'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      email: 'visitor@test.dev',
      topic: 'Checkout support',
      status: 'open'
    });
  });

  test('admin can list categories, create one, and see support tickets', async () => {
    const app = await makeTestApp();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aether.dev', password: 'Admin1234' });

    const token = login.body.token;

    const createCategory = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Arcade', description: 'Fast action games.', status: 'active' });

    expect(createCategory.status).toBe(201);
    expect(createCategory.body.data.name).toBe('Arcade');

    const categories = await request(app)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(categories.status).toBe(200);
    expect(categories.body.data.some(category => category.name === 'Arcade')).toBe(true);

    const tickets = await request(app)
      .get('/api/admin/support-tickets')
      .set('Authorization', `Bearer ${token}`);

    expect(tickets.status).toBe(200);
    expect(Array.isArray(tickets.body.data)).toBe(true);
  });

  test('customer can activate Pro membership from upgrade page endpoint', async () => {
    const app = await makeTestApp();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex@aether.dev', password: 'Player1234' });

    const response = await request(app)
      .post('/api/users/me/upgrade')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.membership).toBe('pro');
  });
});
