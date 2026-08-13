import { describe, it, expect } from 'vitest';
import {
  summarizeVendorBook,
  describeNextDue,
  fmtCentsPlain,
  type VendorBookEntry,
} from './vendor-book-summary';

const base: VendorBookEntry = {
  name: 'Marigold & Co.',
  category: 'Florist',
  status: 'booked',
  costCents: null,
  depositCents: null,
  depositDue: null,
  balanceDue: null,
  depositPaid: false,
  balancePaid: false,
  arrivalTime: null,
};

describe('summarizeVendorBook', () => {
  it('sums booked cost, paid, and unpaid across booked + paid vendors only', () => {
    const s = summarizeVendorBook(
      [
        { ...base, costCents: 120000, depositCents: 30000, depositPaid: true },
        { ...base, name: 'DJ Amara', category: 'DJ', status: 'paid', costCents: 80000, depositPaid: true, depositCents: 20000, balancePaid: true },
        // Considering — a quote, not committed money.
        { ...base, name: 'Maybe Caterer', category: 'Caterer', status: 'considering', costCents: 500000 },
      ],
      '2026-07-02',
    );
    expect(s.bookedCount).toBe(1);
    expect(s.paidCount).toBe(1);
    expect(s.totalBookedCents).toBe(200000);
    // Florist deposit ($300) + DJ deposit ($200) + DJ balance ($600).
    expect(s.paidCents).toBe(110000);
    expect(s.unpaidCents).toBe(90000);
  });

  it('groups per category and never invents a paid figure', () => {
    const s = summarizeVendorBook(
      [
        { ...base, costCents: 100000 },
        { ...base, name: 'Second Florist', costCents: 50000, depositCents: 10000, depositPaid: true },
      ],
      '2026-07-02',
    );
    expect(s.perCategory).toEqual([
      { category: 'Florist', costCents: 150000, paidCents: 10000 },
    ]);
  });

  it('picks the earliest unpaid due, flags past due, and skips paid ones', () => {
    const s = summarizeVendorBook(
      [
        { ...base, depositCents: 50000, depositDue: '2026-07-10' },
        { ...base, name: 'DJ Amara', category: 'DJ', costCents: 80000, balanceDue: '2026-06-03' },
        { ...base, name: 'Paid Up', depositCents: 10000, depositDue: '2026-05-01', depositPaid: true },
      ],
      '2026-07-02',
    );
    expect(s.nextDue).toEqual({
      vendorName: 'DJ Amara',
      kind: 'balance',
      due: '2026-06-03',
      amountCents: 80000,
      pastDue: true,
    });
    expect(describeNextDue(s.nextDue!)).toBe('Balance for DJ Amara was due Jun 3 (past due) — $800');
  });

  it('describes a future due date plainly', () => {
    expect(
      describeNextDue({ vendorName: 'DJ Amara', kind: 'balance', due: '2026-06-03', amountCents: 80000, pastDue: false }),
    ).toBe('Balance for DJ Amara due Jun 3 — $800');
  });

  it('collects arrivals for committed vendors only', () => {
    const s = summarizeVendorBook(
      [
        { ...base, arrivalTime: '10:00 AM' },
        { ...base, name: 'Maybe', status: 'considering', arrivalTime: '9:00 AM' },
      ],
      '2026-07-02',
    );
    expect(s.arrivals).toEqual(['Marigold & Co. — 10:00 AM']);
  });
});

describe('fmtCentsPlain', () => {
  it('renders whole dollars without cents, fractional with', () => {
    expect(fmtCentsPlain(120000)).toBe('$1,200');
    expect(fmtCentsPlain(50)).toBe('$0.50');
  });
});
