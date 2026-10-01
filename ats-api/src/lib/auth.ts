import { sign, verify } from 'hono/jwt';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { db } from '../db/client.js';
import { users, refreshTokens, verificationTokens, auditLogs } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_32_characters_minimum!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_32_characters_minimum!';

// 1. PBKDF2-HMAC-SHA256 with 600,000 iterations via WebCrypto
export async function hashPassword(password: string, saltBase64?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);

  let saltBuffer: Uint8Array;
  if (saltBase64) {
    saltBuffer = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  } else {
    saltBuffer = crypto.getRandomValues(new Uint8Array(16));
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer as BufferSource,
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes
  );

  const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  const salt = btoa(String.fromCharCode(...saltBuffer));

  return { hash, salt };
}

export async function verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, storedSalt);
  return hash === storedHash;
}

// 2. JWT Generation & Verification
export async function createAccessToken(userId: number, email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await sign(
    {
      sub: userId,
      email,
      exp: now + 15 * 60, // 15 minutes
      iat: now,
    },
    JWT_ACCESS_SECRET
  );
}

export async function createRefreshToken(userId: number, familyId?: string): Promise<{ token: string; familyId: string }> {
  const now = Math.floor(Date.now() / 1000);
  const family = familyId || crypto.randomUUID();
  const token = await sign(
    {
      sub: userId,
      familyId: family,
      exp: now + 7 * 24 * 60 * 60, // 7 days
      iat: now,
    },
    JWT_REFRESH_SECRET
  );

  const enc = new TextEncoder();
  const tokenHashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(token));
  const tokenHash = btoa(String.fromCharCode(...new Uint8Array(tokenHashBuffer)));

  // Store in DB
  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    familyId: family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { token, familyId: family };
}

// 3. Refresh Token Rotation with Reuse Detection
export async function rotateRefreshToken(token: string): Promise<{ newAccessToken: string; newRefreshToken: string } | null> {
  try {
    const payload = await verify(token, JWT_REFRESH_SECRET, 'HS256');
    const userId = Number(payload.sub);
    const familyId = String(payload.familyId);

    const enc = new TextEncoder();
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(token));
    const tokenHash = btoa(String.fromCharCode(...new Uint8Array(tokenHashBuffer)));

    // Look up token in DB
    const existing = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.userId, userId)))
      .limit(1);

    if (existing.length === 0 || existing[0].isRevoked) {
      // REUSE DETECTED! Invalidate entire family chain!
      await db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.familyId, familyId));

      await logAudit(userId, 'security_alert', { reason: 'Refresh token reuse detected, family invalidated', familyId });
      return null;
    }

    // Mark current token as revoked/used
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));

    // Get user email
    const userRes = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRes.length === 0) return null;

    // Issue new tokens in same family
    const newAccessToken = await createAccessToken(userId, userRes[0].email);
    const { token: newRefreshToken } = await createRefreshToken(userId, familyId);

    return { newAccessToken, newRefreshToken };
  } catch (err) {
    return null;
  }
}

// 4. Cookie Management (httpOnly, Secure, SameSite)
export function setAuthCookies(c: Context, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/',
    maxAge: 15 * 60, // 15 mins
  });
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, 'access_token', { path: '/' });
  deleteCookie(c, 'refresh_token', { path: '/' });
}

// 5. Verification & Password Reset Emails via Resend (or console fallback)
export async function sendEmailToken(email: string, userId: number, type: 'email_verify' | 'password_reset') {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(verificationTokens).values({
    userId,
    token,
    type,
    expiresAt,
  });

  const frontendUrl = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  const link = type === 'email_verify' 
    ? `${frontendUrl}/verify-email?token=${token}`
    : `${frontendUrl}/reset-password?token=${token}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ATS Analyzer <noreply@ats-analyzer.dev>',
          to: email,
          subject: type === 'email_verify' ? 'Verify your email address' : 'Reset your password',
          html: `<p>Click here to ${type === 'email_verify' ? 'verify your email' : 'reset your password'}:</p><p><a href="${link}">${link}</a></p>`,
        }),
      });
    } catch (e) {
      console.error('Failed to send email via Resend:', e);
    }
  } else {
    console.log(`[AUTH NOTICE] No RESEND_API_KEY configured. Verification link for ${email}: ${link}`);
  }

  return token;
}

// 6. Audit Logging Helper
export async function logAudit(userId: number | null, action: string, details?: any, ip?: string) {
  try {
    await db.insert(auditLogs).values({
      userId: userId || undefined,
      action,
      details,
      ipHash: ip ? btoa(ip) : undefined,
    });
  } catch (err) {
    console.error('Audit log failure:', err);
  }
}
