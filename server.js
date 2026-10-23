/**
 * Utsav Event Planner - Production HTTP Server
 * Zero dependencies, built with native Node.js 18+ modules.
 * Implements strict security headers, rate limiting, payload capping,
 * safe static serving, and REST endpoints.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INPUT_LIMITS } from './src/constants.js';
import { validatePlanningInput } from './src/validate.js';
import { generatePlan } from './src/planner.js';
import { enrichPlanWithAi } from './src/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// MIME types dictionary for static file serving
const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
});

/**
 * In-memory sliding-window rate limiter per client IP.
 */
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  isRateLimited(ip) {
    const now = Date.now();
    const clientRecord = this.requests.get(ip) || [];

    // Filter requests within current window
    const windowStart = now - this.windowMs;
    const recentRequests = clientRecord.filter((timestamp) => timestamp > windowStart);

    if (recentRequests.length >= this.maxRequests) {
      this.requests.set(ip, recentRequests);
      return true;
    }

    recentRequests.push(now);
    this.requests.set(ip, recentRequests);
    return false;
  }

  reset() {
    this.requests.clear();
  }
}

/**
 * Applies security headers to all HTTP responses.
 * @param {http.ServerResponse} res
 */
export function applySecurityHeaders(res) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Extracts client IP address safely.
 * @param {http.IncomingMessage} req
 * @returns {string}
 */
export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';
}

/**
 * Safely serves files from the public directory preventing path traversal.
 * @param {string} reqPath
 * @param {http.ServerResponse} res
 */
export function serveStaticFile(reqPath, res) {
  let relativePath = reqPath === '/' ? '/index.html' : reqPath;
  // Decode URL and strip query strings or hash
  relativePath = decodeURIComponent(relativePath.split('?')[0]);

  const filePath = path.resolve(PUBLIC_DIR, '.' + relativePath);

  // Security Check: Path traversal defense
  if (!filePath.startsWith(PUBLIC_DIR)) {
    applySecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Access forbidden.' }));
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      applySecurityHeaders(res);
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Resource not found.' }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

/**
 * Creates the HTTP application server.
 * @param {Object} [options]
 * @returns {http.Server}
 */
export function createServer(options = {}) {
  const rateLimiter = options.rateLimiter || new RateLimiter(
    Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 60
  );

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const clientIp = getClientIp(req);

    // Apply security headers
    applySecurityHeaders(res);

    // 1. Health check endpoint
    if (pathname === '/api/health') {
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Allow': 'GET', 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    }

    // 2. Planning API endpoint
    if (pathname === '/api/plan') {
      // Disallow non-POST methods
      if (req.method !== 'POST') {
        res.writeHead(405, {
          'Allow': 'POST',
          'Content-Type': 'application/json; charset=utf-8'
        });
        return res.end(JSON.stringify({
          success: false,
          errors: ['Method Not Allowed. Use POST.']
        }));
      }

      // Rate limit check
      if (rateLimiter.isRateLimited(clientIp)) {
        res.writeHead(429, {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': '60'
        });
        return res.end(JSON.stringify({
          success: false,
          errors: ['Too many requests. Please wait a minute before submitting again.']
        }));
      }

      // Content-Type validation
      const contentType = req.headers['content-type'] || '';
      if (!contentType.toLowerCase().startsWith('application/json')) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          success: false,
          errors: ['Invalid Content-Type: Must be application/json.']
        }));
      }

      // Read body with payload size enforcement
      let body = '';
      let bodySize = 0;
      let limitExceeded = false;

      req.on('data', (chunk) => {
        if (limitExceeded) return;
        bodySize += chunk.length;
        if (bodySize > INPUT_LIMITS.MAX_BODY_BYTES) {
          limitExceeded = true;
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            errors: [`Payload Too Large: Maximum allowed size is ${INPUT_LIMITS.MAX_BODY_BYTES} bytes.`]
          }));
          req.destroy();
        } else {
          body += chunk.toString('utf-8');
        }
      });

      req.on('end', async () => {
        if (limitExceeded) return;

        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({
            success: false,
            errors: ['Malformed JSON in request body.']
          }));
        }

        // Strict Server-Side Validation
        const validation = validatePlanningInput(parsedBody);
        if (!validation.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({
            success: false,
            errors: validation.errors
          }));
        }

        try {
          // 1. Pure Deterministic Plan
          const plan = generatePlan(validation.sanitized);

          // 2. GenAI Layer (non-blocking fallback)
          const enrichedPlan = await enrichPlanWithAi(
            plan,
            process.env.GEMINI_API_KEY,
            options.aiOptions
          );

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            data: enrichedPlan
          }));
        } catch (planError) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            errors: ['Internal server error while formulating plan.']
          }));
        }
      });

      return;
    }

    // 3. Static File Serving (HTML, CSS, JS, etc.)
    if (req.method === 'GET') {
      return serveStaticFile(pathname, res);
    }

    // Default 405 for any other method on static paths
    res.writeHead(405, { 'Allow': 'GET', 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  });
}

/**
 * Starts the server if run directly.
 */
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3000;
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Utsav Celebration Planner server running at http://localhost:${PORT}`);
  });
}
