import path from 'node:path';
import request from 'supertest';
import { describe, expect, it, beforeEach } from '@jest/globals';
import { makeTestApp, loginAs } from './testApp.js';

let app;
let adminToken;

beforeEach(async () => {
  app = await makeTestApp();
  adminToken = await loginAs(app, 'admin@aether.dev', 'Admin1234');
});

function baseGamePayload(title = `QA Game ${Date.now()}`) {
  return {
    title,
    shortDescription: 'A testable integration game.',
    description: 'A complete game created by integration testing to validate CRUD contracts.',
    price: '29.99',
    stock: '12',
    developer: 'QA Studio',
    publisher: 'Aether QA',
    releaseDate: '2026-07-01',
    status: 'active',
    esrbRating: 'T',
    genreIds: '1,2',
    platformIds: '1'
  };
}

describe('Admin game CRUD integration flow', () => {
  it('creates a game, reads it by generated id, updates stock, verifies persisted state, and archives it', async () => {
    const payload = baseGamePayload();
    const create = await request(app)
      .post('/api/admin/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .field(payload)
      .attach('coverImage', path.resolve('tests/fixtures/cover.png'));

    expect(create.statusCode).toBe(201);
    const gameId = create.body.data.id;
    expect(gameId).toBeTruthy();

    const read = await request(app).get(`/api/games/${gameId}`);
    expect(read.statusCode).toBe(200);
    expect(read.body.data.title).toBe(payload.title);

    const update = await request(app)
      .put(`/api/admin/games/${gameId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field({ ...payload, stock: '7' });

    expect(update.statusCode).toBe(200);
    expect(update.body.data.stock).toBe(7);

    const afterUpdate = await request(app).get(`/api/games/${gameId}`);
    expect(afterUpdate.statusCode).toBe(200);
    expect(afterUpdate.body.data.stock).toBe(7);

    const archive = await request(app)
      .delete(`/api/admin/games/${gameId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(archive.statusCode).toBe(200);
    expect(archive.body.data.status).toBe('archived');
  });

  it('rejects syntactic edge case: numeric field sent as text', async () => {
    const response = await request(app)
      .post('/api/admin/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .field({ ...baseGamePayload(), price: 'abc' })
      .attach('coverImage', path.resolve('tests/fixtures/cover.png'));

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Validation error');
  });

  it('rejects customer access to admin route with 403', async () => {
    const customerToken = await loginAs(app, 'alex@aether.dev', 'Player1234');
    const response = await request(app)
      .get('/api/admin/games')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.statusCode).toBe(403);
  });
});
