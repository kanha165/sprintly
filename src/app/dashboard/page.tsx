import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardClient from '@/components/DashboardClient';

export const metadata = {
  title: 'Dashboard — Sprintly',
  description: 'View metrics, stats, and analytics for your sprint board.',
};

export default async function DashboardPage() {
  // Retrieve user context server-side
  const currentUser = await getCurrentUser();

  // If no session found, redirect to login
  if (!currentUser) {
    redirect('/login');
  }

  return <DashboardClient currentUser={currentUser} />;
}
