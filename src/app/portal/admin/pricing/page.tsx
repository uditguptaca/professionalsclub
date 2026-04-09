'use client';
import React, { useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { usePortal } from '@/context/portal-context';

export default function AdminPricing() {
  const { pricingRules, updateGlobalPrice, companies } = usePortal();
  
  const globalRule = pricingRules.find(p => p.scopeType === 'global');
  const [globalValue, setGlobalValue] = useState(globalRule?.price || 1);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateGlobalPrice(globalValue);
      setIsSaving(false);
    }, 600);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Dynamic Pricing Engine</h1>
        <p className="text-secondary">Control the marketplace token economy. Prices adjust the cost to request a referral.</p>
      </div>

      {/* Global Setting */}
      <div className="card border-primary-500/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-50 text-primary-600 rounded-xl"><Settings size={24} /></div>
            <div>
              <h2 className="text-xl font-bold font-display">Global Base Price</h2>
              <div className="text-sm text-secondary">The default cost per referral request across the platform.</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Deploying...' : 'Save Rule'}
          </button>
        </div>

        <div className="p-6 bg-bg-elevated rounded-xl border border-border-color flex items-center justify-between">
          <div>
            <div className="font-bold mb-1">Standard Rate (CAD)</div>
            <div className="text-sm text-secondary">Changes take effect immediately for all new requests.</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input 
                type="number" 
                className="input pl-8 w-32 font-mono text-xl" 
                value={globalValue}
                onChange={(e) => setGlobalValue(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Company Overrides */}
      <div>
        <h2 className="text-xl font-bold font-display mb-4">Company Specific Overrides</h2>
        <div className="bg-warning-500/10 border border-warning-500/30 p-4 rounded-lg flex items-start gap-3 mb-6">
          <AlertCircle className="text-warning-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-warning-50">
            <strong>Supply & Demand Control:</strong> Overriding the base price for specific companies helps manage high demand for Tier 1 tech companies where referrer supply is limited.
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-color bg-bg-elevated/50 text-sm text-secondary">
                <th className="p-4 font-medium uppercase tracking-wider">Company</th>
                <th className="p-4 font-medium uppercase tracking-wider">Demand Tier</th>
                <th className="p-4 font-medium uppercase tracking-wider">Current Price</th>
                <th className="p-4 font-medium uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => {
                const override = pricingRules.find(p => p.scopeType === 'company' && p.scopeId === company.id);
                const activePrice = override ? override.price : globalRule?.price;
                
                return (
                  <tr key={company.id} className="border-b border-border-color last:border-0 hover:bg-bg-glass-hover">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{ background: company.color }}>
                        {company.logo}
                      </div>
                      <span className="font-bold">{company.name}</span>
                    </td>
                    <td className="p-4">
                      {company.pricingTier === 'premium' ? (
                        <span className="badge badge-accent bg-accent-500/20 px-2">High Demand</span>
                      ) : (
                        <span className="badge badge-neutral px-2">Standard</span>
                      )}
                    </td>
                    <td className="p-4 font-mono">
                      <div className="flex items-center gap-2">
                         ${activePrice}.00
                         {override && <span className="text-[10px] uppercase tracking-wider text-primary-600 font-bold bg-primary-100 px-1.5 py-0.5 rounded">CUSTOM</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="btn btn-outline btn-sm">Edit Rule</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
