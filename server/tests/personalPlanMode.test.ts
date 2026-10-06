import request from 'supertest';
import { it, expect } from 'vitest';
import app from '../src/app';
import { createAuthedUser } from './helpers/auth';
import { useTestDatabase } from './helpers/db';
useTestDatabase();
it('persists non-gym onboarding mode and rejects unknown modes', async () => {
  const user = await createAuthedUser();
  const saved = await request(app).put('/api/profile').set(user.auth).send({ trainingMode: 'OTHER' });
  expect(saved.status).toBe(200);
  expect(saved.body.data.trainingMode).toBe('OTHER');
  expect((await request(app).get('/api/profile').set(user.auth)).body.data.trainingMode).toBe('OTHER');
  expect((await request(app).put('/api/profile').set(user.auth).send({ trainingMode: 'UNKNOWN' })).status).toBe(400);
});
