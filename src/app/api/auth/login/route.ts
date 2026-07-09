import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { signJWT } from '@/lib/jwt';
import { ok, fail, guard } from '@/lib/response';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const POST = guard(async (req: NextRequest) => {
  const body = await req.json();

  // Validate inputs
  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return fail(400, validation.error.issues[0].message);
  }

  const { email, password } = validation.data;

  // Find user by email
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, password_hash, role, avatar, created_at')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error || !user) {
    return fail(401, 'Invalid email or password');
  }

  // Verify password hash
  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return fail(401, 'Invalid email or password');
  }

  // Create JWT payload (exclude password_hash)
  const payload = {
    userId: user.id,
    role: user.role as any,
    name: user.name,
    email: user.email,
  };

  // Sign token
  const token = await signJWT(payload);

  // Exclude password_hash from response user object
  const { password_hash, ...safeUser } = user;

  // Set HTTP-only cookie
  const response = ok({ user: safeUser });
  response.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 2 * 60 * 60, // 2 hours
    path: '/',
  });

  return response;
});
