import { cookies } from 'next/headers';
import { verifyJWT } from './jwt';
import { JWTPayload } from './types';

/**
 * Retrieves the current logged-in user from the HTTP-only cookie.
 * edge/server-side helper.
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return null;
    }
    return await verifyJWT(token);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}
