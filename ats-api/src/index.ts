import './tracing.js'; // OTel SDK — must be first import
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { db } from './db/client.js';
import { users, verificationTokens, resumes, jobPostings, analyses } from './db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  sendEmailToken,
  logAudit,
} from './lib/auth.js';
import { computeATSScore, type StructuredResume } from './lib/scoring.js';
import { extractSkills, suggestRewrite } from './lib/ai.js';
import { detectLanguage } from './lib/heuristics.js';
import { exportResumeDocument } from './lib/export/index.js';
import {
  BatchAnalysisRequestSchema,
  ExportResumeRequestSchema,
  type BatchJobItem,
  type SubScores,
} from '@ats-analyzer/contracts';

const app = new Hono();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_32_characters_minimum!';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const ATS_JOB_FETCHER_URL = process.env.ATS_JOB_FETCHER_URL || 'http://localhost:3001';

// 1. Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

// 2. CORS Middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return ALLOWED_ORIGIN;
      if (origin === ALLOWED_ORIGIN || origin === 'http://localhost:5173') return origin;
      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Rate Limiting Middleware with dynamic weight
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(limit: number, windowSecs: number, getWeight?: (c: any) => Promise<number>) {
  return async (c: any, next: any) => {
    const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const weight = getWeight ? await getWeight(c) : 1;
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: weight, resetAt: now + windowSecs * 1000 });
      return next();
    }

    if (entry.count + weight > limit) {
      return c.json({ error: 'Too many requests. Please wait before retrying.' }, 429);
    }

    entry.count += weight;
    return next();
  };
}

// 4. Auth Verification Helper
async function getAuthenticatedUser(c: any): Promise<{ id: number; email: string } | null> {
  const token = getCookie(c, 'access_token');
  if (!token) return null;

  try {
    const payload = await verify(token, JWT_ACCESS_SECRET, 'HS256');
    return { id: Number(payload.sub), email: String(payload.email) };
  } catch (err) {
    return null;
  }
}

// 5. Global Error Handling Middleware
app.onError((err, c) => {
  console.error('[API Error]:', err);
  return c.json(
    {
      error: 'An internal server error occurred',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'healthy', timestamp: new Date().toISOString() }));

// --- SWAGGER / OPENAPI DOCS ---
app.get('/api-docs/openapi.json', (c) => {
  return c.json({
    openapi: '3.1.0',
    info: {
      title: 'ATS Resume & Job-Match Analyzer API',
      version: '1.0.0',
      description: 'Open-source ATS resume scoring, bilingual extraction, and gap-closing microservice API.',
    },
    paths: {
      '/api/analyze': {
        post: {
          summary: 'Analyze single resume against a job posting',
          responses: { '200': { description: 'Analysis score breakdown and extracted requirements' } },
        },
      },
      '/api/analyze/batch': {
        post: {
          summary: 'Batch compare a resume against up to 5 job postings',
          responses: { '200': { description: 'Batch comparison results with rankings' } },
        },
      },
      '/api/export': {
        post: {
          summary: 'Export resume in PDF, DOCX, or LaTeX formats',
          responses: { '200': { description: 'Document binary or base64 attachment' } },
        },
      },
      '/api/rewrite-bullet': {
        post: {
          summary: 'AI-assisted ethical bullet rewrite for missing skills',
          responses: { '200': { description: 'Rewritten bullet point' } },
        },
      },
    },
  });
});

app.get('/api-docs', swaggerUI({ url: '/api-docs/openapi.json' }));

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', rateLimit(10, 60), async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password || password.length < 8) {
    return c.json({ error: 'Valid email and password (min 8 chars) are required.' }, 400);
  }

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  if (existing.length > 0) {
    return c.json({ error: 'An account with this email already exists.' }, 409);
  }

  const { hash, salt } = await hashPassword(password);
  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      salt,
    })
    .returning();

  await sendEmailToken(newUser.email, newUser.id, 'email_verify');
  await logAudit(newUser.id, 'register', { email: newUser.email }, c.req.header('x-forwarded-for'));

  const accessToken = await createAccessToken(newUser.id, newUser.email);
  const { token: refreshToken } = await createRefreshToken(newUser.id);
  setAuthCookies(c, accessToken, refreshToken);

  return c.json({
    message: 'User registered successfully. Please verify your email.',
    user: { id: newUser.id, email: newUser.email, emailVerified: false },
  });
});

// Login
app.post('/api/auth/login', rateLimit(10, 60), async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email and password are required.' }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  if (!user || !user.passwordHash || !user.salt) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const accessToken = await createAccessToken(user.id, user.email);
  const { token: refreshToken } = await createRefreshToken(user.id);
  setAuthCookies(c, accessToken, refreshToken);
  await logAudit(user.id, 'login', null, c.req.header('x-forwarded-for'));

  return c.json({
    message: 'Logged in successfully.',
    user: { id: user.id, email: user.email, emailVerified: !!user.emailVerified },
  });
});

// Logout
app.post('/api/auth/logout', async (c) => {
  clearAuthCookies(c);
  return c.json({ message: 'Logged out successfully.' });
});

// Refresh Token with Rotation & Reuse Detection
app.post('/api/auth/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token');
  if (!refreshToken) {
    return c.json({ error: 'No refresh token provided' }, 401);
  }

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    clearAuthCookies(c);
    return c.json({ error: 'Invalid or revoked refresh token. Session cleared.' }, 401);
  }

  setAuthCookies(c, rotated.newAccessToken, rotated.newRefreshToken);
  return c.json({ message: 'Token refreshed successfully.' });
});

// Current User
app.get('/api/auth/me', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) return c.json({ user: null });
  return c.json({ user });
});

// Email Verification
app.post('/api/auth/verify-email', async (c) => {
  const { token } = await c.req.json();
  if (!token) return c.json({ error: 'Verification token required' }, 400);

  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, token), eq(verificationTokens.type, 'email_verify')))
    .limit(1);

  if (!record || record.usedAt || new Date() > record.expiresAt) {
    return c.json({ error: 'Token is invalid or has expired.' }, 400);
  }

  await db.update(verificationTokens).set({ usedAt: new Date() }).where(eq(verificationTokens.token, token));
  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, record.userId));

  return c.json({ message: 'Email verified successfully.' });
});

// Forgot Password
app.post('/api/auth/forgot-password', rateLimit(5, 60), async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  if (user) {
    await sendEmailToken(user.email, user.id, 'password_reset');
  }

  return c.json({ message: 'If an account exists with this email, a reset link has been sent.' });
});

// Reset Password
app.post('/api/auth/reset-password', rateLimit(5, 60), async (c) => {
  const { token, newPassword } = await c.req.json();
  if (!token || !newPassword || newPassword.length < 8) {
    return c.json({ error: 'Valid token and new password (min 8 chars) required.' }, 400);
  }

  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, token), eq(verificationTokens.type, 'password_reset')))
    .limit(1);

  if (!record || record.usedAt || new Date() > record.expiresAt) {
    return c.json({ error: 'Token is invalid or has expired.' }, 400);
  }

  const { hash, salt } = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: hash, salt }).where(eq(users.id, record.userId));
  await db.update(verificationTokens).set({ usedAt: new Date() }).where(eq(verificationTokens.token, token));
  await logAudit(record.userId, 'reset_password');

  return c.json({ message: 'Password has been reset successfully. You can now log in.' });
});

// --- HELPER: Fetch Single Job Content via ats-job-fetcher with SSRF Guard ---
async function resolveJobText(job: { text?: string; url?: string }): Promise<string> {
  if (job.text && job.text.trim().length >= 50) {
    return job.text.trim();
  }

  if (job.url) {
    const fetcherRes = await fetch(`${ATS_JOB_FETCHER_URL}/api/fetch-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: job.url }),
    });

    if (!fetcherRes.ok) {
      const err: any = await fetcherRes.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch job posting from URL: ${job.url}`);
    }

    const data: any = await fetcherRes.json();
    return data.text;
  }

  throw new Error('Each job posting must provide either description text (min 50 chars) or a valid URL.');
}

// --- CORE MATCH & SCORING (Single) ---
app.post('/api/analyze', rateLimit(15, 60), async (c) => {
  const body = await c.req.json();
  const { resumeData, jobText, jobUrl, language, saveToAccount } = body;

  if (!resumeData) {
    return c.json({ error: 'Resume structured data is required.' }, 400);
  }

  let finalJobText: string;
  try {
    finalJobText = await resolveJobText({ text: jobText, url: jobUrl });
  } catch (err: any) {
    return c.json({ error: err.message }, 422);
  }

  // Language resolution: explicit parameter > auto-detection > default 'en'
  const detectedLang = detectLanguage(finalJobText);
  const targetLang: 'en' | 'tr' = language === 'tr' || language === 'en' ? language : detectedLang;

  const cfEnv = (c.env as any) || {};
  const extractedRequirements = await extractSkills(cfEnv, finalJobText, targetLang);
  const scoreResult = computeATSScore(resumeData as StructuredResume, extractedRequirements, targetLang);

  const user = await getAuthenticatedUser(c);
  let savedAnalysisId: number | null = null;

  if (user && saveToAccount) {
    const [savedResume] = await db
      .insert(resumes)
      .values({
        userId: user.id,
        title: resumeData.contact?.name ? `${resumeData.contact.name}'s Resume` : 'Untitled Resume',
        structuredJson: resumeData,
      })
      .returning();

    const [savedJob] = await db
      .insert(jobPostings)
      .values({
        userId: user.id,
        sourceUrl: jobUrl || null,
        rawText: finalJobText,
        extractedJson: extractedRequirements,
      })
      .returning();

    const [savedAnalysis] = await db
      .insert(analyses)
      .values({
        userId: user.id,
        resumeId: savedResume.id,
        jobPostingId: savedJob.id,
        scoreBreakdownJson: scoreResult,
        gapsJson: {
          missingTech: scoreResult.subScores.keywordMatch.missingTech,
          missingHard: scoreResult.subScores.keywordMatch.missingHard,
          missingSoft: scoreResult.subScores.keywordMatch.missingSoft,
        },
      })
      .returning();

    savedAnalysisId = savedAnalysis.id;
    await logAudit(user.id, 'analysis_run', { analysisId: savedAnalysisId });
  }

  return c.json({
    analysisId: savedAnalysisId,
    language: targetLang,
    scoreResult,
    extractedRequirements,
    jobText: finalJobText,
  });
});

// --- MULTI-JOB BATCH COMPARISON ---
// Cap: 5 jobs maximum
// Rate-limit scaled proportionally to batch size
app.post(
  '/api/analyze/batch',
  rateLimit(30, 60, async (c) => {
    try {
      const cloned = await c.req.raw.clone().json();
      return Array.isArray(cloned?.jobs)
        ? Math.max(1, Math.min(cloned.jobs?.length || 1, 5))
        : 1;
    } catch {
      return 1;
    }
  }),
  async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }

    // Validate using BatchAnalysisRequestSchema
    const parseResult = BatchAnalysisRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          error: 'Validation failed for batch analysis',
          details: parseResult.error.flatten(),
        },
        400
      );
    }

    const { resumeData, jobs, language: reqLanguage } = parseResult.data;

    // Strict 5-job cap check
    if (jobs.length > 5) {
      return c.json({ error: 'Batch comparison accepts a maximum of 5 job postings per request.' }, 400);
    }

    if (jobs.length === 0) {
      return c.json({ error: 'At least one job posting must be provided.' }, 400);
    }

    const cfEnv = (c.env as any) || {};
    const results = [];

    for (let i = 0; i < jobs.length; i++) {
      const jobInput: BatchJobItem = jobs[i];
      try {
        const finalJobText = await resolveJobText({ text: jobInput.jobText, url: jobInput.jobUrl });
        const detected = detectLanguage(finalJobText);
        const targetLang: 'en' | 'tr' = reqLanguage === 'tr' || reqLanguage === 'en' ? reqLanguage : detected;

        const extractedRequirements = await extractSkills(cfEnv, finalJobText, targetLang);
        const scoreResult = computeATSScore(resumeData as StructuredResume, extractedRequirements, targetLang);

        results.push({
          jobIndex: i,
          jobId: jobInput.id || `job-${i + 1}`,
          jobTitle: jobInput.jobTitle || `Job Posting ${i + 1}`,
          company: jobInput.company,
          overallScore: scoreResult.overallScore,
          subScores: scoreResult.subScores,
          matchedSkills: [
            ...scoreResult.subScores.keywordMatch.matchedTech,
            ...scoreResult.subScores.keywordMatch.matchedHard,
          ],
          missingSkills: [
            ...scoreResult.subScores.keywordMatch.missingTech,
            ...scoreResult.subScores.keywordMatch.missingHard,
          ],
          gaps: [],
          extractedRequirements,
          error: undefined,
        });
      } catch (err: any) {
        const fallbackSubScores: SubScores = {
          keywordMatch: {
            score: 0,
            techMatchRate: 0,
            hardSkillMatchRate: 0,
            softSkillMatchRate: 0,
            matchedTech: [],
            missingTech: [],
            matchedHard: [],
            missingHard: [],
            matchedSoft: [],
            missingSoft: [],
          },
          formatParseability: {
            score: 0,
            issues: ['Failed to process job posting'],
            passedChecks: [],
          },
          experienceFit: {
            score: 0,
            yearsRequired: null,
            yearsEstimated: 0,
            feedback: 'Job processing failed',
          },
          sectionCompleteness: {
            score: 0,
            missingSections: [],
            presentSections: [],
          },
          ...({ formatAndParseability: 0 } as any),
        };

        results.push({
          jobIndex: i,
          jobId: jobInput.id || `job-${i + 1}`,
          jobTitle: jobInput.jobTitle || `Job Posting ${i + 1}`,
          company: jobInput.company,
          overallScore: 0,
          subScores: fallbackSubScores,
          matchedSkills: [],
          missingSkills: [],
          gaps: [],
          extractedRequirements: null,
          error: err.message || 'Failed to process job posting.',
        });
      }
    }

    // Rank jobs by overall score (excluding errored jobs)
    const ranked = [...results]
      .filter((r) => r.error === undefined)
      .sort((a, b) => b.overallScore - a.overallScore);

    const errors = results
      .filter((r) => r.error !== undefined)
      .map((r) => ({ jobIndex: r.jobIndex, error: r.error as string }));

    return c.json({
      success: true,
      totalJobs: jobs.length,
      processedJobs: results.length,
      successCount: results.filter((r) => r.error === undefined).length,
      bestMatch: ranked[0] || null,
      results,
      ...(errors.length > 0 ? { errors } : {}),
    });
  }
);

// --- BILINGUAL MULTI-FORMAT EXPORT (PDF, DOCX, LaTeX) ---
app.post('/api/export', rateLimit(20, 60), async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const parseResult = ExportResumeRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Validation failed for export request',
        details: parseResult.error.flatten(),
      },
      400
    );
  }

  try {
    const result = await exportResumeDocument(parseResult.data);

    // If client explicitly requests JSON base64
    const acceptHeader = c.req.header('accept') || '';
    const queryFormat = c.req.query('format') || '';
    const wantsJson = acceptHeader.includes('application/json') || (body as any)?.output === 'base64' || queryFormat === 'base64';
    if (wantsJson) {
      return c.json({
        success: true,
        format: parseResult.data.format,
        language: parseResult.data.language,
        filename: decodeURIComponent(result.encodedFilename),
        contentBase64: result.buffer.toString('base64'),
      });
    }

    const safeEncodedFilename = result.encodedFilename.replace(/'/g, '%27');
    const safeAsciiFilename = result.asciiFilename
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I');

    // Return binary document download
    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${safeEncodedFilename}`,
        'Content-Length': result.buffer.byteLength.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    });
  } catch (err: any) {
    console.error('[Export Error]:', err);
    return c.json({ error: 'Failed to generate exported document', message: err.message }, 500);
  }
});

// --- AI REWRITE BULLET ---
app.post('/api/rewrite-bullet', rateLimit(20, 60), async (c) => {
  const { originalBullet, missingSkill, language } = await c.req.json();
  if (
    typeof originalBullet !== 'string' ||
    typeof missingSkill !== 'string' ||
    !originalBullet.trim() ||
    !missingSkill.trim()
  ) {
    return c.json({ error: 'Original bullet and missing skill are required.' }, 400);
  }

  const targetLang: 'en' | 'tr' = language === 'tr' || language === 'en' ? language : detectLanguage(originalBullet);
  const cfEnv = (c.env as any) || {};
  const suggestedText = await suggestRewrite(cfEnv, originalBullet, missingSkill, targetLang);

  return c.json({
    original: originalBullet,
    skill: missingSkill,
    language: targetLang,
    suggestion: suggestedText,
  });
});

// --- SAVED ANALYSES (Strict IDOR / Ownership Checks) ---
app.get('/api/analyses', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const userAnalyses = await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, user.id))
    .orderBy(desc(analyses.createdAt));

  return c.json({ analyses: userAnalyses });
});

app.get('/api/analyses/:id', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const id = Number(c.req.param('id'));
  const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);

  if (!analysis || analysis.userId !== user.id) {
    return c.json({ error: 'Analysis not found or access denied.' }, 404);
  }

  return c.json({ analysis });
});

app.delete('/api/analyses/:id', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const id = Number(c.req.param('id'));
  const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);

  if (!analysis || analysis.userId !== user.id) {
    return c.json({ error: 'Analysis not found or access denied.' }, 404);
  }

  await db.delete(analyses).where(eq(analyses.id, id));
  await logAudit(user.id, 'analysis_deleted', { analysisId: id });

  return c.json({ message: 'Analysis deleted successfully.' });
});

export default app;

const port = Number(process.env.PORT) || 3000;
const isTest =
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('test'));

if (!isTest && !process.env.CF_PAGES) {
  console.log(`ats-api running on port ${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}
