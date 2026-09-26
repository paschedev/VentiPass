import type { RevenuePoint } from '@/utils/sales-chart';

export interface Transaction {
  name: string;
  event: string;
  amount: number | string;
  time: string;
  status: string;
}

// Respuesta de GET /events/organizer/stats.
export interface DashboardStats {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  activeEvents: number;
  chartData: RevenuePoint[];
  recentTransactions: Transaction[];
}
