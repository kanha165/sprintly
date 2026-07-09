import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long';
const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Signs a custom JWT token with jose (Edge runtime safe)
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h') // Token expires in 2 hours
    .sign(secretKey);
}

/**
 * Verifies a custom JWT token with jose (Edge runtime safe)
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as JWTPayload;
  } catch (error) {
    // If verification fails (expired, invalid secret, tampered), return null
    return null;
  }
}
