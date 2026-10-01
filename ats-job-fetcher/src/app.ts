import { Hono } from 'hono';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { fetchWithRedirectValidation, SsrfError, ValidationError } from './validator.js';

export const app = new Hono();

/**
 * Extracts clean job title and description text from a job posting URL
 * using Mozilla Readability and JSDOM, protected by strict SSRF and redirect validation.
 */
export async function fetchJobFromUrl(
  targetUrl: string
): Promise<{ title: string; text: string; siteName?: string }> {
  const { response, finalUrl } = await fetchWithRedirectValidation(targetUrl);
  const html = await response.text();

  if (html.length < 100 || html.includes('enable JavaScript') || html.includes('Please log in')) {
    throw new Error(
      'Page appears to be paywalled or requires JavaScript rendering. Please paste the job description text manually.'
    );
  }

  const doc = new JSDOM(html, { url: finalUrl });
  const reader = new Readability(doc.window.document);
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length === 0) {
    throw new Error(
      'Could not extract meaningful content from the page. Please paste the job description manually.'
    );
  }

  const parsedUrl = new URL(finalUrl);
  return {
    title: article.title || 'Job Posting',
    text: article.textContent.trim(),
    siteName: article.siteName || parsedUrl.hostname,
  };
}

// Health check endpoint
app.get('/api/health', (c) =>
  c.json({
    status: 'healthy',
    ok: true,
    service: 'ats-job-fetcher',
  })
);

// Single URL fetch with SSRF protection
app.post('/api/fetch-job', async (c) => {
  try {
    const body = await c.req.json();
    const targetUrl = body?.url;

    if (!targetUrl) {
      return c.json({ error: 'URL is required' }, 400);
    }

    const result = await fetchJobFromUrl(targetUrl);
    return c.json(result);
  } catch (err: any) {
    if (
      err instanceof SsrfError ||
      err.statusCode === 403 ||
      err.message?.includes('SSRF blocked') ||
      err.message?.includes('private or loopback IP range')
    ) {
      return c.json({ error: err.message }, 403);
    }

    if (
      err instanceof ValidationError ||
      err.statusCode === 400 ||
      err.message?.includes('Invalid URL') ||
      err.message?.includes('Invalid scheme') ||
      err.message?.includes('Invalid port')
    ) {
      return c.json({ error: err.message }, 400);
    }

    return c.json({ error: err.message }, 422);
  }
});

// Batch URL fetch with independent SSRF check per URL (capped at 5 URLs)
app.post('/api/fetch-jobs-batch', async (c) => {
  try {
    const body = await c.req.json();
    const urls: string[] = body?.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return c.json({ error: 'Array of URLs is required' }, 400);
    }

    if (urls.length > 5) {
      return c.json({ error: 'Batch fetch accepts a maximum of 5 URLs per request.' }, 400);
    }

    const results = await Promise.all(
      urls.map(async (url, idx) => {
        try {
          const res = await fetchJobFromUrl(url);
          return { url, index: idx, success: true, ...res, error: null };
        } catch (e: any) {
          return { url, index: idx, success: false, title: null, text: null, error: e.message };
        }
      })
    );

    return c.json({ total: urls.length, results });
  } catch (err: any) {
    return c.json({ error: 'Failed to process batch fetch', details: err.message }, 500);
  }
});
