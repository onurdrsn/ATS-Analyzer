import { test, describe } from 'node:test';
import assert from 'node:assert';
import { app } from '../src/app.js';
import { isPrivateIP } from '../src/validator.js';

describe('ats-job-fetcher SSRF Protection & Extraction Tests', () => {
  describe('Unit: isPrivateIP', () => {
    test('blocks IPv4 loopback addresses (127.0.0.0/8, 0.0.0.0/8)', () => {
      assert.strictEqual(isPrivateIP('127.0.0.1'), true);
      assert.strictEqual(isPrivateIP('127.0.0.2'), true);
      assert.strictEqual(isPrivateIP('127.255.255.255'), true);
      assert.strictEqual(isPrivateIP('0.0.0.0'), true);
      assert.strictEqual(isPrivateIP('0.1.2.3'), true);
    });

    test('blocks IPv4 RFC 1918 private ranges', () => {
      // 10.0.0.0/8
      assert.strictEqual(isPrivateIP('10.0.0.1'), true);
      assert.strictEqual(isPrivateIP('10.255.255.255'), true);

      // 172.16.0.0/12
      assert.strictEqual(isPrivateIP('172.16.0.1'), true);
      assert.strictEqual(isPrivateIP('172.31.255.255'), true);
      assert.strictEqual(isPrivateIP('172.15.0.1'), false); // public
      assert.strictEqual(isPrivateIP('172.32.0.1'), false); // public

      // 192.168.0.0/16
      assert.strictEqual(isPrivateIP('192.168.0.1'), true);
      assert.strictEqual(isPrivateIP('192.168.1.1'), true);
      assert.strictEqual(isPrivateIP('192.168.255.255'), true);
    });

    test('blocks IPv4 link-local (169.254.0.0/16)', () => {
      assert.strictEqual(isPrivateIP('169.254.169.254'), true);
      assert.strictEqual(isPrivateIP('169.254.1.1'), true);
    });

    test('blocks CGNAT (100.64.0.0/10)', () => {
      assert.strictEqual(isPrivateIP('100.64.0.1'), true);
      assert.strictEqual(isPrivateIP('100.127.255.255'), true);
      assert.strictEqual(isPrivateIP('100.63.255.255'), false); // public
      assert.strictEqual(isPrivateIP('100.128.0.1'), false); // public
    });

    test('blocks benchmarking (198.18.0.0/15)', () => {
      assert.strictEqual(isPrivateIP('198.18.0.1'), true);
      assert.strictEqual(isPrivateIP('198.19.255.255'), true);
      assert.strictEqual(isPrivateIP('198.20.0.1'), false); // public
    });

    test('blocks multicast, reserved, and broadcast (224.0.0.0/4, 240.0.0.0/4, 255.255.255.255)', () => {
      assert.strictEqual(isPrivateIP('224.0.0.1'), true);
      assert.strictEqual(isPrivateIP('239.255.255.255'), true);
      assert.strictEqual(isPrivateIP('240.0.0.1'), true);
      assert.strictEqual(isPrivateIP('255.255.255.255'), true);
    });

    test('blocks IPv6 loopback and unspecified (::1, ::)', () => {
      assert.strictEqual(isPrivateIP('::1'), true);
      assert.strictEqual(isPrivateIP('[::1]'), true);
      assert.strictEqual(isPrivateIP('::'), true);
      assert.strictEqual(isPrivateIP('0:0:0:0:0:0:0:1'), true);
    });

    test('blocks IPv6 link-local, unique local, multicast (fe80::/10, fc00::/7, ff00::/8)', () => {
      assert.strictEqual(isPrivateIP('fe80::1'), true);
      assert.strictEqual(isPrivateIP('[fe80::1]'), true);
      assert.strictEqual(isPrivateIP('fc00::1'), true);
      assert.strictEqual(isPrivateIP('fd00::1234'), true);
      assert.strictEqual(isPrivateIP('ff02::1'), true);
    });

    test('blocks IPv4-mapped IPv6 (::ffff:0:0/96)', () => {
      assert.strictEqual(isPrivateIP('::ffff:127.0.0.1'), true);
      assert.strictEqual(isPrivateIP('[::ffff:127.0.0.1]'), true);
      assert.strictEqual(isPrivateIP('::ffff:10.0.0.1'), true);
      assert.strictEqual(isPrivateIP('::ffff:7f00:1'), true);
    });

    test('allows legitimate public IP addresses', () => {
      assert.strictEqual(isPrivateIP('8.8.8.8'), false);
      assert.strictEqual(isPrivateIP('1.1.1.1'), false);
      assert.strictEqual(isPrivateIP('93.184.216.34'), false);
      assert.strictEqual(isPrivateIP('2606:4700:4700::1111'), false);
    });
  });

  describe('Route: POST /api/fetch-job SSRF Protection', () => {
    test('blocks loopback addresses (127.0.0.1, 127.0.0.2, localhost, 0.0.0.0) -> 403 Forbidden', async () => {
      const targets = [
        'http://127.0.0.1/job',
        'http://127.0.0.2:8080/job',
        'http://localhost/job',
        'http://0.0.0.0/job',
      ];

      for (const url of targets) {
        const res = await app.request('/api/fetch-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        assert.strictEqual(
          res.status,
          403,
          `Expected 403 Forbidden for loopback target: ${url}, got ${res.status}`
        );
        const data = await res.json();
        assert.match(
          data.error,
          /SSRF blocked|private or loopback/i,
          `Error message should indicate SSRF block for ${url}`
        );
      }
    });

    test('blocks private IP ranges (10.0.0.1, 172.16.0.1, 192.168.1.1, 169.254.169.254) -> 403 Forbidden', async () => {
      const targets = [
        'http://10.0.0.1/job',
        'http://172.16.0.1:8080/job',
        'http://192.168.1.1/job',
        'http://169.254.169.254/latest/meta-data',
      ];

      for (const url of targets) {
        const res = await app.request('/api/fetch-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        assert.strictEqual(
          res.status,
          403,
          `Expected 403 Forbidden for private IP target: ${url}, got ${res.status}`
        );
        const data = await res.json();
        assert.match(
          data.error,
          /SSRF blocked|private or loopback/i,
          `Error message should indicate SSRF block for ${url}`
        );
      }
    });

    test('blocks IPv6 loopback ([::1]) and IPv4-mapped IPv6 ([::ffff:127.0.0.1]) -> 403 Forbidden', async () => {
      const targets = [
        'http://[::1]/job',
        'http://[::ffff:127.0.0.1]/job',
      ];

      for (const url of targets) {
        const res = await app.request('/api/fetch-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        assert.strictEqual(
          res.status,
          403,
          `Expected 403 Forbidden for IPv6 target: ${url}, got ${res.status}`
        );
        const data = await res.json();
        assert.match(
          data.error,
          /SSRF blocked|private or loopback/i,
          `Error message should indicate SSRF block for ${url}`
        );
      }
    });

    test('rejects invalid schemes (file:///etc/passwd, ftp://example.com, gopher://) -> 400 Bad Request', async () => {
      const invalidSchemes = [
        'file:///etc/passwd',
        'ftp://example.com/job',
        'gopher://evil.com',
        'data:text/html,<html>Evil</html>',
      ];

      for (const url of invalidSchemes) {
        const res = await app.request('/api/fetch-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        assert.strictEqual(
          res.status,
          400,
          `Expected 400 Bad Request for scheme: ${url}, got ${res.status}`
        );
        const data = await res.json();
        assert.match(
          data.error,
          /Invalid URL|scheme/i,
          `Error message should indicate scheme or URL format violation for ${url}`
        );
      }
    });

    test('rejects non-standard ports (e.g. 22, 6379, 5432) -> 400 Bad Request', async () => {
      const invalidPortUrls = [
        'http://example.com:22/job',
        'http://example.com:6379/job',
        'http://example.com:5432/job',
      ];

      for (const url of invalidPortUrls) {
        const res = await app.request('/api/fetch-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        assert.strictEqual(
          res.status,
          400,
          `Expected 400 Bad Request for non-standard port: ${url}, got ${res.status}`
        );
        const data = await res.json();
        assert.match(
          data.error,
          /Invalid port/i,
          `Error message should mention invalid port for ${url}`
        );
      }
    });

    test('blocks 302 redirect targeting an internal IP -> 403 Forbidden', async () => {
      const originalFetch = globalThis.fetch;
      try {
        // Intercept fetch for the redirect test URL so hop 0 passes public DNS validation,
        // but returns a 302 redirect pointing to an internal loopback address.
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          if (urlString.includes('test-redirect-ssrf-attack')) {
            return new Response(null, {
              status: 302,
              headers: {
                Location: 'http://127.0.0.1:8080/cloud-metadata',
              },
            });
          }
          return originalFetch(input, init);
        };

        const res = await app.request('/api/fetch-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://example.com/test-redirect-ssrf-attack' }),
        });

        assert.strictEqual(
          res.status,
          403,
          `Expected 403 Forbidden when redirect targets an internal IP, got ${res.status}`
        );
        const data = await res.json();
        assert.match(
          data.error,
          /SSRF blocked|private or loopback/i,
          'Redirect to internal IP should be blocked with SSRF error'
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('fetches valid public URL -> 200 OK with extracted job title and description text', async () => {
      const res = await app.request('/api/fetch-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      });

      assert.strictEqual(res.status, 200, `Expected 200 OK for valid public URL, got ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.title, 'Example Domain');
      assert.ok(data.text && data.text.length > 20, 'Extracted text should not be empty');
      assert.match(data.text, /documentation examples/i, 'Extracted text should match page content');
    });

    test('rejects missing URL in request body -> 400 Bad Request', async () => {
      const res = await app.request('/api/fetch-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'URL is required');
    });
  });

  describe('Route: POST /api/fetch-jobs-batch & GET /api/health', () => {
    test('health check returns 200 healthy status', async () => {
      const res = await app.request('/api/health');
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'healthy');
      assert.strictEqual(data.service, 'ats-job-fetcher');
    });

    test('rejects batch requests with > 5 URLs -> 400 Bad Request', async () => {
      const res = await app.request('/api/fetch-jobs-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [
            'https://example.com/1',
            'https://example.com/2',
            'https://example.com/3',
            'https://example.com/4',
            'https://example.com/5',
            'https://example.com/6',
          ],
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /maximum of 5 URLs/i);
    });

    test('isolates failures per URL in batch requests without failing the whole batch', async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          if (urlString.includes('job-opening')) {
            return new Response(
              '<!DOCTYPE html><html><head><title>Senior Engineer</title></head><body><article><h1>Senior Engineer</h1><p>We are hiring an experienced software engineer to join our cloud platform team.</p></article></body></html>',
              {
                status: 200,
                headers: { 'Content-Type': 'text/html' },
              }
            );
          }
          return originalFetch(input, init);
        };

        const res = await app.request('/api/fetch-jobs-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: [
              'http://127.0.0.1/private-job',
              'https://example.com/job-opening',
            ],
          }),
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.total, 2);
        assert.strictEqual(data.results[0].success, false);
        assert.match(data.results[0].error, /SSRF blocked/i);
        assert.strictEqual(data.results[1].success, true);
        assert.strictEqual(data.results[1].title, 'Senior Engineer');
        assert.match(data.results[1].text, /experienced software engineer/i);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
