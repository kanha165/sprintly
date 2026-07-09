import { NextResponse } from 'next/server';

/**
 * Standard successful API response
 */
export function ok<T>(data?: T) {
  return NextResponse.json({ ok: true, data }, { status: 200 });
}

/**
 * Standard failed API response
 */
export function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Generic API route wrapper to handle unhandled exceptions cleanly
 */
export function guard(fn: (...args: any[]) => Promise<NextResponse>) {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error: any) {
      console.error('API execution failed:', error);
      return fail(500, error.message || 'Internal Server Error');
    }
  };
}
