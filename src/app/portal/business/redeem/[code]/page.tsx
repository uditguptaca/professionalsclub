'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import CouponScanner from '@/components/portal/CouponScanner';

/**
 * Where a member's QR leads.
 *
 * The QR encodes this URL, so the phone's own camera app works as a scanner
 * for a business whose browser will not hand over the camera - it opens here,
 * the layout demands the business login, and the code redeems on arrival.
 *
 * Someone else scanning that QR lands on the same page and gets "that code
 * belongs to another business", because the code alone was never the
 * authority: mark_coupon_redeemed() checks who is asking.
 */
export default function RedeemByScanPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? '').toUpperCase();

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <Link
            href="/portal/business"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44,
              fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Your business
          </Link>
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.35rem', margin: 0 }}>Scanned code</h1>
          </div>
          <CouponScanner initialCode={code} />
        </section>
      </div>
    </div>
  );
}
