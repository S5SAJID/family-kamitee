import {describe, expect, it} from 'vitest';
import {
  addInterval,
  allowedCollections,
  cycleEnd,
  defaultInstallments,
  eligibleMembers,
  getEntry,
  installmentDue,
  khataKey,
  nextUndrawnRound,
  perMemberPerRound,
  potPerRound,
  roundEnd,
  roundStart,
  roundStats,
  roundStatus,
  secureRandomInt,
  secureShuffle,
} from './calc';
import {buildSampleData} from './sample';
import {toISODate} from './format';
import type {KametiData} from './types';

const iso = toISODate;
const sample = (): KametiData => buildSampleData();

describe('intervals', () => {
  it('derives installments per round', () => {
    expect(defaultInstallments('daily', 'weekly')).toBe(7);
    expect(defaultInstallments('daily', 'monthly')).toBe(30);
    expect(defaultInstallments('weekly', 'monthly')).toBe(4);
    expect(defaultInstallments('weekly', 'weekly')).toBe(1);
    expect(defaultInstallments('monthly', 'monthly')).toBe(1);
  });

  it('never allows collecting slower than paying out', () => {
    expect(allowedCollections('weekly')).toEqual(['daily', 'weekly']);
    expect(allowedCollections('monthly')).toEqual(['daily', 'weekly', 'monthly']);
  });

  it('clamps month ends', () => {
    expect(iso(addInterval(new Date(2026, 0, 31), 'monthly', 1))).toBe('2026-02-28');
    expect(iso(addInterval(new Date(2028, 0, 31), 'monthly', 1))).toBe('2028-02-29');
    expect(iso(addInterval(new Date(2026, 0, 31), 'monthly', 2))).toBe('2026-03-31');
    expect(iso(addInterval(new Date(2026, 11, 29), 'weekly', 1))).toBe('2027-01-05');
  });
});

describe('money and schedule (sample committee)', () => {
  const {committee: c, members} = sample();

  it('computes pot', () => {
    expect(perMemberPerRound(c!)).toBe(10_000);
    expect(potPerRound(c!, members.length)).toBe(1_00_000);
  });

  it('computes round dates', () => {
    expect(iso(roundStart(c!, 1))).toBe('2026-06-01');
    expect(iso(roundStart(c!, 5))).toBe('2026-10-01');
    expect(iso(roundEnd(c!, 5))).toBe('2026-10-31');
    expect(iso(cycleEnd(c!, members.length))).toBe('2027-03-31');
    expect([0, 1, 2, 3].map(i => iso(installmentDue(c!, 5, i)))).toEqual([
      '2026-10-01',
      '2026-10-08',
      '2026-10-15',
      '2026-10-22',
    ]);
  });

  it('computes round stats', () => {
    const s = roundStats(sample(), 5);
    expect(s.target).toBe(1_00_000);
    expect(s.collected + s.remaining).toBe(s.target);
    expect(s.paidMembers + s.partialMembers + s.pendingMembers).toBe(10);
  });
});

describe('khata entries', () => {
  it('returns an empty entry for unknown keys', () => {
    const e = getEntry(sample(), 9, 'mbr_01');
    expect(e.paid).toEqual([null, null, null, null]);
    expect(e.mode).toBe('cash');
  });

  it('pads / trims when installmentsPerRound changes', () => {
    const d = sample();
    d.committee = {...d.committee!, installmentsPerRound: 6};
    expect(getEntry(d, 1, 'mbr_01').paid).toHaveLength(6);
    d.committee = {...d.committee, installmentsPerRound: 2};
    expect(getEntry(d, 1, 'mbr_01').paid).toHaveLength(2);
    expect(d.khata[khataKey(1, 'mbr_01')].paid).toHaveLength(4); // stored data untouched
  });
});

describe('round lifecycle', () => {
  it('derives status', () => {
    const d = sample(); // rounds 1-4 handed over, round 5 current & undrawn
    expect(roundStatus(d, 1)).toBe('handedOver');
    expect(roundStatus(d, 5)).toBe('awaitingDraw');
    expect(roundStatus(d, 6)).toBe('upcoming');
    d.draws.push({round: 5, memberId: 'mbr_02', at: '', method: 'single'});
    expect(roundStatus(d, 5)).toBe('awaitingHandover');
    d.draws.push({round: 6, memberId: 'mbr_06', at: '', method: 'upfront'});
    expect(roundStatus(d, 6)).toBe('upcoming'); // drawn but not reached yet
  });

  it('excludes winners from later draws', () => {
    const d = sample();
    const ids = eligibleMembers(d).map(m => m.id);
    expect(ids).toHaveLength(6);
    for (const w of ['mbr_01', 'mbr_03', 'mbr_04', 'mbr_05']) expect(ids).not.toContain(w);
    expect(nextUndrawnRound(d)).toBe(5);
  });
});

describe('fair randomness', () => {
  it('secureRandomInt stays in range and is uniform', () => {
    const n = 7;
    const runs = 70_000;
    const counts = Array(n).fill(0);
    for (let i = 0; i < runs; i++) {
      const v = secureRandomInt(n);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(n);
      counts[v]++;
    }
    // Chi-square, 6 degrees of freedom: p = 0.001 critical value is 22.46.
    const exp = runs / n;
    const chi = counts.reduce((a, c) => a + (c - exp) ** 2 / exp, 0);
    expect(chi).toBeLessThan(22.46);
  });

  it('secureShuffle returns a permutation with uniform positions', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const runs = 25_000;
    const firstPos: Record<string, number> = {};
    for (let i = 0; i < runs; i++) {
      const s = secureShuffle(items);
      expect([...s].sort()).toEqual(items);
      firstPos[s[0]] = (firstPos[s[0]] ?? 0) + 1;
    }
    const exp = runs / items.length;
    const chi = items.reduce((a, k) => a + ((firstPos[k] ?? 0) - exp) ** 2 / exp, 0);
    expect(chi).toBeLessThan(18.47); // 4 dof, p = 0.001
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']); // input not mutated
  });
});
