import type {
  CollectionInterval,
  Committee,
  KametiData,
  KhataEntry,
  PayoutInterval,
} from './types';
import {parseISODate} from './format';

/** Sensible default number of installments in one payout round. */
export function defaultInstallments(c: CollectionInterval, p: PayoutInterval): number {
  if (c === 'daily') return p === 'weekly' ? 7 : 30;
  if (c === 'weekly') return p === 'weekly' ? 1 : 4;
  return 1; // monthly -> monthly
}

/** Collection must not be slower than payout. */
export function allowedCollections(p: PayoutInterval): CollectionInterval[] {
  return p === 'weekly' ? ['daily', 'weekly'] : ['daily', 'weekly', 'monthly'];
}

export function addInterval(d: Date, interval: CollectionInterval | PayoutInterval, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (interval === 'daily') r.setDate(r.getDate() + n);
  else if (interval === 'weekly') r.setDate(r.getDate() + 7 * n);
  else {
    const day = r.getDate();
    r.setDate(1);
    r.setMonth(r.getMonth() + n);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, last));
  }
  return r;
}

export function perMemberPerRound(c: Committee): number {
  return c.contribution * c.installmentsPerRound;
}

export function potPerRound(c: Committee, memberCount: number): number {
  return perMemberPerRound(c) * memberCount;
}

export function roundStart(c: Committee, round: number): Date {
  return addInterval(parseISODate(c.startDate), c.payoutInterval, round - 1);
}

export function roundEnd(c: Committee, round: number): Date {
  const next = addInterval(parseISODate(c.startDate), c.payoutInterval, round);
  next.setDate(next.getDate() - 1);
  return next;
}

export function installmentDue(c: Committee, round: number, idx: number): Date {
  return addInterval(roundStart(c, round), c.collectionInterval, idx);
}

export function cycleEnd(c: Committee, memberCount: number): Date {
  return roundEnd(c, Math.max(1, memberCount));
}

export function khataKey(round: number, memberId: string): string {
  return `${round}:${memberId}`;
}

export function emptyEntry(c: Committee): KhataEntry {
  return {paid: Array(c.installmentsPerRound).fill(null), mode: 'cash', note: ''};
}

export function getEntry(data: KametiData, round: number, memberId: string): KhataEntry {
  const c = data.committee!;
  const e = data.khata[khataKey(round, memberId)];
  if (!e) return emptyEntry(c);
  if (e.paid.length !== c.installmentsPerRound) {
    const paid = Array(c.installmentsPerRound)
      .fill(null)
      .map((_, i) => e.paid[i] ?? null);
    return {...e, paid};
  }
  return e;
}

export function paidCount(e: KhataEntry): number {
  return e.paid.filter(Boolean).length;
}

export interface RoundStats {
  target: number;
  collected: number;
  remaining: number;
  paidMembers: number; // fully paid
  partialMembers: number;
  pendingMembers: number; // nothing paid
  installmentsPaid: number;
  installmentsTotal: number;
}

export function roundStats(data: KametiData, round: number): RoundStats {
  const c = data.committee!;
  const n = data.members.length;
  let inst = 0;
  let full = 0;
  let partial = 0;
  for (const m of data.members) {
    const e = getEntry(data, round, m.id);
    const pc = paidCount(e);
    inst += pc;
    if (pc === c.installmentsPerRound) full++;
    else if (pc > 0) partial++;
  }
  const target = potPerRound(c, n);
  const collected = inst * c.contribution;
  return {
    target,
    collected,
    remaining: Math.max(0, target - collected),
    paidMembers: full,
    partialMembers: partial,
    pendingMembers: n - full - partial,
    installmentsPaid: inst,
    installmentsTotal: n * c.installmentsPerRound,
  };
}

export function winnerOf(data: KametiData, round: number) {
  const d = data.draws.find(x => x.round === round);
  if (!d) return null;
  return data.members.find(m => m.id === d.memberId) ?? null;
}

export function drawnMemberIds(data: KametiData): Set<string> {
  return new Set(data.draws.map(d => d.memberId));
}

export function eligibleMembers(data: KametiData) {
  const drawn = drawnMemberIds(data);
  return data.members.filter(m => !drawn.has(m.id));
}

/** Next round that does not yet have a parchi drawn. */
export function nextUndrawnRound(data: KametiData): number | null {
  const n = data.members.length;
  const rounds = new Set(data.draws.map(d => d.round));
  for (let r = 1; r <= n; r++) if (!rounds.has(r)) return r;
  return null;
}

export function roundForMember(data: KametiData, memberId: string): number | null {
  return data.draws.find(d => d.memberId === memberId)?.round ?? null;
}

export function totalRounds(data: KametiData): number {
  return data.members.length;
}

/** Unbiased crypto-secure integer in [0, max). */
export function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** Fisher–Yates shuffle with crypto randomness. */
export function secureShuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type RoundStatusKind = 'handedOver' | 'awaitingHandover' | 'awaitingDraw' | 'upcoming';

export function roundStatus(data: KametiData, round: number): RoundStatusKind {
  if (data.rounds[round]?.handedOverAt) return 'handedOver';
  const drawn = data.draws.some(d => d.round === round);
  if (round > data.currentRound) return 'upcoming';
  return drawn ? 'awaitingHandover' : 'awaitingDraw';
}
