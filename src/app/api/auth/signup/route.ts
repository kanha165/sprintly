import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { signJWT } from '@/lib/jwt';
import { ok, fail, guard } from '@/lib/response';

// Input validation schema
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const POST = guard(async (req: NextRequest) => {
  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    return fail(
      503,
      'Database not configured. Please set up Supabase credentials in .env.local file. See README.md for instructions.'
    );
  }

  const body = await req.json();

  // Validate request body
  const validation = signupSchema.safeParse(body);
  if (!validation.success) {
    return fail(400, validation.error.issues[0].message);
  }

  const { name, email, password } = validation.data;

  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  // Insert user into Supabase. Role is FORCED to 'member'.
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      name,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'member', // Strict role requirement
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    })
    .select('id, name, email, role, avatar, created_at')
    .single();

  if (error) {
    console.error('Signup error:', error);
    
    // Unique key violation code in Postgres is 23505
    if (error.code === '23505') {
      return fail(409, 'Email address is already registered');
    }
    
    // Check for connection errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return fail(503, 'Unable to connect to database. Please check your Supabase configuration.');
    }
    
    return fail(400, error.message || 'Signup failed');
  }

  // Create JWT payload
  const payload = {
    userId: newUser.id,
    role: newUser.role as any,
    name: newUser.name,
    email: newUser.email,
  };

  // Sign JWT token
  const token = await signJWT(payload);

  // Set HTTP-only cookie in response
  const response = ok({ user: newUser });
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
