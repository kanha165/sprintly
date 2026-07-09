import { NextRequest } from 'next/server';
import { ok, guard } from '@/lib/response';

export const POST = guard(async (req: NextRequest) => {
  const response = ok({ message: 'Logged out successfully' });
  
  // Clear the cookie by setting maxAge to 0 and an empty value
  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Immediately expires the cookie
    path: '/',
  });

  return response;
});
