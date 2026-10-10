import {describe, expect, it} from 'vitest';
import {fmtDate, fmtShortDate, groupPK, money, parseISODate, toISODate, waNumber} from './format';

describe('money', () => {
  it('uses South Asian grouping', () => {
    expect(groupPK(100000)).toBe('1,00,000');
    expect(groupPK(12345678)).toBe('1,23,45,678');
    expect(groupPK(999.6)).toBe('1,000');
  });

  it('formats with symbol and sign', () => {
    expect(money(100000)).toBe('Rs. 1,00,000');
    expect(money(2500, '₨')).toBe('₨ 2,500');
    expect(money(-5000)).toBe('-Rs. 5,000');
  });
});

describe('dates', () => {
  it('parses ISO dates as local calendar dates (no UTC shift)', () => {
    const d = parseISODate('2026-06-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 1]);
    expect(toISODate(d)).toBe('2026-06-01');
  });

  it('formats dates', () => {
    expect(fmtDate('2026-10-01')).toBe('1 Oct 2026');
    expect(fmtShortDate('2027-03-31')).toBe('31 Mar');
  });
});

describe('waNumber', () => {
  it.each([
    ['0300-1234567', '923001234567'],
    ['+92 300 1234567', '923001234567'],
    ['0092 300 1234567', '923001234567'],
    ['3001234567', '923001234567'],
    ['923001234567', '923001234567'],
  ])('%s -> %s', (input, out) => expect(waNumber(input)).toBe(out));
});
