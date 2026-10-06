import request from 'supertest';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import app from '../src/app';
import { createAuthedUser } from './helpers/auth';
import { useTestDatabase } from './helpers/db';
import { llm } from '../src/services/ai/llm';
import { CoachMessageModel, CoachRequestModel } from '../src/models/coach.model';
import { coachConsent } from '../src/services/ai/coachConsent';
useTestDatabase();
beforeEach(() => { coachConsent.enabled = true; });
afterEach(() => { vi.restoreAllMocks(); coachConsent.enabled = false; });
describe('persistent coach', () => {
  it('blocks PT data sharing until explicit consent is enabled', async () => {
    coachConsent.enabled = false;
    const a = await createAuthedUser();
    expect((await request(app).post('/api/coach/messages').set(a.auth).send({ requestId: 'blocked', text: 'Hello' })).status).toBe(503);
    expect(await CoachRequestModel.countDocuments()).toBe(0);
  });
  it('defaults to disabled, saves check-in and isolates account data', async () => {
    const a = await createAuthedUser(); const b = await createAuthedUser();
    expect((await request(app).get('/api/coach/settings').set(a.auth)).body.data.enabled).toBe(false);
    expect((await request(app).post('/api/coach/check-in').set(a.auth).send({ energy: 2, difficulty: 4, note: 'Busy today' })).status).toBe(200);
    expect((await request(app).put('/api/coach/settings').set(a.auth).send({ enabled: true, maxPerDay: 5 })).body.data.maxPerDay).toBe(5);
    expect((await request(app).get('/api/coach/settings').set(b.auth)).body.data.enabled).toBe(false);
    expect((await request(app).get('/api/coach/overview').set(a.auth)).body.data).toMatchObject({ dailyAdvice: null, weeklyReview: null, recentMessages: [] });
  });
  it('replays chat without calling AI again and rejects reused input', async () => {
    const a = await createAuthedUser(); const b = await createAuthedUser();
    vi.spyOn(llm, 'generateJson').mockResolvedValue({ content: 'Take a comfortable walk.' });
    const first = await request(app).post('/api/coach/messages').set(a.auth).send({ requestId: 'chat-1', text: 'What can I do?' });
    expect(first.status).toBe(200); expect(first.body.data.role).toBe('assistant');
    vi.spyOn(llm, 'generateJson').mockRejectedValue(new Error('Must not execute again'));
    const again = await request(app).post('/api/coach/messages').set(a.auth).send({ requestId: 'chat-1', text: 'What can I do?' });
    expect(again.body.data.id).toBe(first.body.data.id);
    expect((await request(app).post('/api/coach/messages').set(a.auth).send({ requestId: 'chat-1', text: 'Different' })).status).toBe(409);
    expect((await request(app).get('/api/coach/messages').set(a.auth)).body.data).toHaveLength(2);
    expect((await request(app).get('/api/coach/messages').set(b.auth)).body.data).toHaveLength(0);
    expect(await CoachMessageModel.countDocuments({})).toBe(2);
  });
  it('validates mocked structured output and persists failure without repeating paid calls', async () => {
    const a = await createAuthedUser();
    vi.spyOn(llm, 'generateJson').mockResolvedValue({ content: '' });
    expect((await request(app).post('/api/coach/review').set(a.auth).send({ requestId: 'bad', kind: 'WEEKLY' })).status).toBe(502);
    expect(await CoachRequestModel.countDocuments({ state: 'FAILED' })).toBe(1);
    expect((await request(app).post('/api/coach/review').set(a.auth).send({ requestId: 'bad', kind: 'WEEKLY' })).status).toBe(502);
  });
});
