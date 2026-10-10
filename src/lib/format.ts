import type {Lang} from './types';

const pkNumber = new Intl.NumberFormat('en-IN', {maximumFractionDigits: 0});

/** South-Asian grouping: 100000 -> "1,00,000". */
export function groupPK(n: number): string {
  return pkNumber.format(Math.round(n));
}

/** "Rs. 1,00,000" or "₨ 1,00,000". */
export function money(n: number, symbol: string = 'Rs.'): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}${symbol} ${groupPK(Math.abs(n))}`;
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse YYYY-MM-DD as a local date (no timezone shift). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtDate(d: Date | string, _lang: Lang = 'en'): string {
  const date = typeof d === 'string' ? (d.length === 10 ? parseISODate(d) : new Date(d)) : d;
  return `${date.getDate()} ${MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`;
}

export function fmtShortDate(d: Date | string): string {
  const date = typeof d === 'string' ? (d.length === 10 ? parseISODate(d) : new Date(d)) : d;
  return `${date.getDate()} ${MONTHS_EN[date.getMonth()]}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const hh = ((h + 11) % 12) + 1;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(d)}, ${hh}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Pakistani mobile -> WhatsApp international form (923001234567). */
export function waNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(2);
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return '92' + digits.slice(1);
  if (digits.length === 10 && digits.startsWith('3')) return '92' + digits;
  return digits;
}

export function uid(prefix = 'id'): string {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `${prefix}_${a[0].toString(36)}${a[1].toString(36)}`;
}
