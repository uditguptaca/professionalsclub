'use client';
import React from 'react';
import { BarChart3, Users, Briefcase, TrendingUp } from 'lucide-react';
import { usePortal } from '@/context/portal-context';

export default function AdminDashboard() {
  const { requests, employees } = usePortal();

  // Mock revenue calculation
  const totalRevenue = requests.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.priceCharged, 0);

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Platform Overview</h1>
        <p className="text-secondary">High-level metrics for the IndoCanada Club referral engine.</p>
      </div>

      <div className="grid grid-4 gap-6">
        <div className="card-stat card-glow border-primary-500/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-primary-500/20 text-primary-400 rounded-lg"><BarChart3 /></div>
            <div className="text-sm font-bold text-muted uppercase tracking-wider">Gross Revenue</div>
          </div>
          <div className="text-4xl font-black font-display mb-1 flex items-baseline gap-1">
            <span className="text-sm text-secondary font-medium">$</span>
            {totalRevenue + 850}
          </div>
          <div className="text-xs text-success-400 font-medium">+15% this week</div>
        </div>

        <div className="card-stat">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Users /></div>
            <div className="text-sm font-bold text-muted uppercase tracking-wider">Total Seekers</div>
          </div>
          <div className="text-4xl font-black font-display mb-1">1,420</div>
          <div className="text-xs text-secondary font-medium">85 verified profiles</div>
        </div>

        <div className="card-stat">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-accent-500/20 text-accent-400 rounded-lg"><Briefcase /></div>
            <div className="text-sm font-bold text-muted uppercase tracking-wider">Referrers</div>
          </div>
          <div className="text-4xl font-black font-display mb-1">{employees.filter(e => e.status === 'active').length + 42}</div>
          <div className="text-xs text-warning-400 font-medium">{employees.filter(e => e.status === 'pending').length} pending approval</div>
        </div>

        <div className="card-stat">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-success-500/20 text-success-400 rounded-lg"><TrendingUp /></div>
            <div className="text-sm font-bold text-muted uppercase tracking-wider">Match Rate</div>
          </div>
          <div className="text-4xl font-black font-display mb-1">68%</div>
          <div className="text-xs text-success-400 font-medium">Excellent health</div>
        </div>
      </div>

      <div className="grid grid-2 gap-8">
        <div className="card">
          <h3 className="font-bold mb-4 font-display text-lg">System Health</h3>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-bg-elevated p-3 rounded-lg border border-border-color">
              <span className="text-sm font-medium">Average Match Time</span>
              <span className="font-mono text-primary-400">4.2 hours</span>
            </div>
            <div className="flex justify-between items-center bg-bg-elevated p-3 rounded-lg border border-border-color">
              <span className="text-sm font-medium">Unanswered Requests</span>
              <span className="font-mono text-warning-600 hover:underline cursor-pointer">{requests.filter(r => r.status === 'queued').length} active</span>
            </div>
            <div className="flex justify-between items-center bg-bg-elevated p-3 rounded-lg border border-border-color">
              <span className="text-sm font-medium">Refund Rate</span>
              <span className="font-mono text-success-400">1.2%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold mb-4 font-display text-lg">Recent Transactions</h3>
          <div className="flex flex-col gap-3">
            {requests.filter(r => r.priceCharged > 0).slice(0,4).map((r, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border-color last:border-0">
                <div>
                  <div className="text-sm font-bold">{r.seekerName}</div>
                  <div className="text-xs text-secondary mt-0.5">Request at {r.companyName}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-success-400">+${r.priceCharged}.00</div>
                  <div className="text-xs text-muted">Paid via Stripe</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
