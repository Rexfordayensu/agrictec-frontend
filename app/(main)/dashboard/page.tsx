import type { Metadata } from 'next';
import { FarmerDashboard } from '@/components/dashboard/farmer-dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <FarmerDashboard />;
}
