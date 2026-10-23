import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

describe('Server Module - Endpoints & Security Integration', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createServer();
    await new Promise((resolve) => {
      // Listen on dynamic port
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('serves static index.html with 200 OK and security headers', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/html'));

    // Check mandatory security headers
    assert.ok(res.headers.get('content-security-policy'));
    assert.ok(res.headers.get('content-security-policy').includes("script-src 'self'"));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  it('serves static styles.css and app.js correctly', async () => {
    const resCss = await fetch(`${baseUrl}/styles.css`);
    assert.equal(resCss.status, 200);
    assert.ok(resCss.headers.get('content-type').includes('text/css'));

    const resJs = await fetch(`${baseUrl}/app.js`);
    assert.equal(resJs.status, 200);
    assert.ok(resJs.headers.get('content-type').includes('application/javascript'));
  });

  it('blocks path traversal attempts and returns 403 or 404', async () => {
    const res = await fetch(`${baseUrl}/../server.js`);
    // Should be forbidden or not found
    assert.ok(res.status === 403 || res.status === 404);
  });

  it('responds with 200 OK for GET /api/health', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
  });

  it('responds with 405 Method Not Allowed on invalid methods for /api/plan', async () => {
    const resGet = await fetch(`${baseUrl}/api/plan`);
    assert.equal(resGet.status, 405);
    assert.equal(resGet.headers.get('allow'), 'POST');

    const resPut = await fetch(`${baseUrl}/api/plan`, { method: 'PUT' });
    assert.equal(resPut.status, 405);
  });

  it('responds with 400 Bad Request if Content-Type is missing or not application/json', async () => {
    const res = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'plain text'
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.errors.some((e) => e.includes('Content-Type')));
  });

  it('responds with 400 Bad Request on malformed JSON body', async () => {
    const res = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not valid json'
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.errors.some((e) => e.includes('Malformed JSON')));
  });

  it('responds with 400 Bad Request on validation error (e.g. negative budget)', async () => {
    const res = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'wedding',
        guestCount: 200,
        totalBudget: -5000,
        eventDate: '2026-12-15',
        city: 'Jaipur',
        venueType: 'indoor',
        diet: 'veg',
        preferences: ''
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.errors.length > 0);
  });

  it('responds with 200 OK and valid celebration plan for valid payload', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const dateStr = futureDate.toISOString().split('T')[0];

    const res = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'wedding',
        guestCount: 250,
        totalBudget: 1200000,
        eventDate: dateStr,
        city: 'Jaipur',
        venueType: 'outdoor',
        diet: 'mixed',
        preferences: 'Royal Rajasthani folk music and live sweets counter'
      })
    });

    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.success, true);
    assert.ok(result.data.budget);
    assert.equal(result.data.budget.checkSum, 1200000);
    assert.ok(result.data.timeline.milestones.length > 5);
    assert.ok(result.data.vendors.length > 5);
    assert.ok(result.data.personalizedIdeas.length > 0);
  });

  it('responds with 413 Payload Too Large when payload exceeds 64KB', async () => {
    const hugePayload = {
      eventType: 'wedding',
      guestCount: 200,
      totalBudget: 1000000,
      eventDate: '2026-12-15',
      city: 'Delhi',
      venueType: 'indoor',
      diet: 'veg',
      preferences: 'A'.repeat(70000) // 70 KB
    };

    const res = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hugePayload)
    });

    assert.equal(res.status, 413);
  });

  it('enforces rate limiting and returns 429 when threshold exceeded', async () => {
    // Custom tight rate limiter server for test
    const tightServer = createServer({
      rateLimiter: {
        isRateLimited: (() => {
          let count = 0;
          return () => {
            count += 1;
            return count > 3; // Allow 3 requests, block 4th
          };
        })()
      }
    });

    await new Promise((resolve) => tightServer.listen(0, '127.0.0.1', resolve));
    const tightUrl = `http://127.0.0.1:${tightServer.address().port}`;

    try {
      const payload = JSON.stringify({
        eventType: 'birthday',
        guestCount: 50,
        totalBudget: 50000,
        eventDate: '2026-12-01',
        city: 'Pune',
        venueType: 'indoor',
        diet: 'veg'
      });

      // Send 3 requests
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${tightUrl}/api/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });
        assert.equal(res.status, 200);
      }

      // 4th request must be rate limited (429)
      const resRateLimited = await fetch(`${tightUrl}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });

      assert.equal(resRateLimited.status, 429);
      assert.equal(resRateLimited.headers.get('retry-after'), '60');
      const data = await resRateLimited.json();
      assert.equal(data.success, false);
      assert.ok(data.errors.some((e) => e.includes('Too many requests')));
    } finally {
      await new Promise((resolve) => tightServer.close(resolve));
    }
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/non-existent-page-xyz`);
    assert.equal(res.status, 404);
  });
});
