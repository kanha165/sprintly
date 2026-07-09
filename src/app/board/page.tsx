import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import BoardClient from '@/components/board/BoardClient';

export const metadata = {
  title: 'Sprint Board — Sprintly',
  description: 'Manage tasks and tracks progress across columns dynamically.',
};

export default async function BoardPage() {
  // Retrieve user context server-side
  const currentUser = await getCurrentUser();

  // If no session found, redirect to login (safeguard in case middleware is bypassed)
  if (!currentUser) {
    redirect('/login');
  }

  return <BoardClient currentUser={currentUser} />;
}
