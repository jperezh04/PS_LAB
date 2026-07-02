import request from 'supertest';
import { describe, expect, it, beforeEach } from '@jest/globals';
import { makeTestApp } from './testApp.js';

let app;
let token;

beforeEach(async () => {
  app = await makeTestApp();
  const register = await request(app)
    .post('/api/auth/register')
    .send({ username: `cart_user_${Date.now()}`, email: `cart${Date.now()}@aether.dev`, password: 'Player1234' });
  token = register.body.token;
});

describe('Cart and checkout integration flow', () => {
  it('adds a game to cart, verifies cross-endpoint persistence, checks out, and confirms stock changed', async () => {
    const before = await request(app).get('/api/games/1');
    const initialStock = before.body.data.stock;

    const add = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: 1, quantity: 2 });

    expect(add.statusCode).toBe(201);
    expect(add.body.data.items).toHaveLength(1);

    const cart = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(cart.statusCode).toBe(200);
    expect(cart.body.data.items[0].quantity).toBe(2);

    const checkout = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(checkout.statusCode).toBe(201);
    expect(checkout.body.data.status).toBe('paid');

    const after = await request(app).get('/api/games/1');
    expect(after.body.data.stock).toBe(initialStock - 2);
  });

  it('rejects edge case: quantity above stock with 409', async () => {
    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: 1, quantity: 9999 });

    expect(response.statusCode).toBe(409);
    expect(response.body.message).toBe('Insufficient stock.');
  });

  it('rejects syntactic edge case: invalid quantity type with 400', async () => {
    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: 1, quantity: 'two' });

    expect(response.statusCode).toBe(400);
  });
});
