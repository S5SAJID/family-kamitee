/**
 * PNG khata slips drawn on a canvas (no external libraries, fully offline).
 * Colors and fonts are read from the active Astryx theme tokens.
 */
import type {KametiData, Member} from './types';
import type {TFn} from './i18n';
import {
  getEntry,
  installmentDue,
  paidCount,
  perMemberPerRound,
  potPerRound,
  roundEnd,
  roundStart,
  roundStats,
  winnerOf,
} from './calc';
import {fmtDate, fmtDateTime, fmtShortDate, money} from './format';
import {saveFile} from './platform';

function tokens() {
  const el = document.querySelector('main') ?? document.body;
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    bg: v('--color-background-surface', '#ffffff'),
    muted: v('--color-background-muted', '#f1f1f1'),
    text: v('--color-text-primary', '#000000'),
    secondary: v('--color-text-secondary', '#474747'),
    border: v('--color-border-emphasized', '#d4d4d4'),
    green: v('--color-text-green', '#00490b'),
    greenBg: v('--color-background-green', '#bce0bb'),
    red: v('--color-text-red', '#76000c'),
    redBg: v('--color-background-red', '#ffc4be'),
    orange: v('--color-text-orange', '#622700'),
    orangeBg: v('--color-background-orange', '#ffc7a1'),
    font: v('--font-family-body', "'Segoe UI', sans-serif"),
    heading: v('--font-family-heading', "'Segoe UI', sans-serif"),
  };
}

interface Painter {
  c: CanvasRenderingContext2D;
  tk: ReturnType<typeof tokens>;
  w: number;
  y: number;
  pad: number;
}

function text(p: Painter, s: string, x: number, size: number, opts: {weight?: number; color?: string; align?: CanvasTextAlign; font?: string} = {}) {
  p.c.font = `${opts.weight ?? 400} ${size}px ${opts.font ?? p.tk.font}`;
  p.c.fillStyle = opts.color ?? p.tk.text;
  p.c.textAlign = opts.align ?? 'left';
  p.c.textBaseline = 'alphabetic';
  p.c.fillText(s, x, p.y);
}

function line(p: Painter, dashed = false) {
  p.c.strokeStyle = p.tk.border;
  p.c.lineWidth = 1;
  p.c.setLineDash(dashed ? [6, 5] : []);
  p.c.beginPath();
  p.c.moveTo(p.pad, p.y);
  p.c.lineTo(p.w - p.pad, p.y);
  p.c.stroke();
  p.c.setLineDash([]);
}

function pill(p: Painter, label: string, x: number, kind: 'paid' | 'pending' | 'partial', align: 'left' | 'right' = 'left') {
  const color = kind === 'paid' ? p.tk.green : kind === 'partial' ? p.tk.orange : p.tk.red;
  const bg = kind === 'paid' ? p.tk.greenBg : kind === 'partial' ? p.tk.orangeBg : p.tk.redBg;
  p.c.font = `600 15px ${p.tk.font}`;
  const tw = p.c.measureText(label).width;
  const w = tw + 24;
  const x0 = align === 'right' ? x - w : x;
  p.c.fillStyle = bg;
  p.c.beginPath();
  p.c.roundRect(x0, p.y - 18, w, 26, 13);
  p.c.fill();
  p.c.fillStyle = color;
  p.c.textAlign = 'left';
  p.c.fillText(label, x0 + 12, p.y);
}

function makeCanvas(width: number, height: number) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const c = canvas.getContext('2d')!;
  c.scale(scale, scale);
  return {canvas, c};
}

function header(p: Painter, data: KametiData, title: string, round: number, t: TFn) {
  const cm = data.committee!;
  p.y = p.pad + 18;
  text(p, t('appName').toUpperCase(), p.pad, 14, {weight: 600, color: p.tk.secondary});
  text(p, title, p.w - p.pad, 14, {weight: 700, color: p.tk.secondary, align: 'right'});
  p.y += 36;
  text(p, cm.title, p.pad, 28, {weight: 700, font: p.tk.heading});
  p.y += 26;
  text(
    p,
    `${t('round')} ${round} / ${data.members.length}  ·  ${fmtDate(roundStart(cm, round))} – ${fmtDate(roundEnd(cm, round))}`,
    p.pad,
    16,
    {color: p.tk.secondary},
  );
  p.y += 22;
  line(p);
}

function footer(p: Painter, data: KametiData, t: TFn) {
  p.y += 8;
  line(p, true);
  p.y += 26;
  text(p, t('rc.generated', {d: fmtDateTime(new Date().toISOString())}), p.pad, 13, {color: p.tk.secondary});
  text(p, `${t('rc.footer')} · ${data.committee!.organizer}`, p.w - p.pad, 13, {color: p.tk.secondary, align: 'right'});
}

async function exportCanvas(canvas: HTMLCanvasElement, filename: string) {
  const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/png'));
  return saveFile(filename, blob, {name: 'PNG image', extensions: ['png']});
}

const safe = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');

/** Per-member payment receipt for one round. */
export async function saveMemberReceipt(data: KametiData, member: Member, round: number, t: TFn, sym: string) {
  const cm = data.committee!;
  const e = getEntry(data, round, member.id);
  const k = cm.installmentsPerRound;
  const rowH = 34;
  const W = 720;
  const H = 330 + k * rowH + (e.note ? 50 : 0);
  const {canvas, c} = makeCanvas(W, H);
  const p: Painter = {c, tk: tokens(), w: W, y: 0, pad: 36};
  c.fillStyle = p.tk.bg;
  c.fillRect(0, 0, W, H);

  header(p, data, t('rc.title'), round, t);
  p.y += 34;
  text(p, member.name, p.pad, 22, {weight: 700});
  const paid = paidCount(e);
  const status = paid === k ? 'paid' : paid > 0 ? 'partial' : 'pending';
  pill(p, t(`st.${status}`), W - p.pad, status, 'right');
  p.y += 22;
  text(p, `${member.phone}  ·  ${t('mode')}: ${t(`pm.${e.mode}`)}`, p.pad, 15, {color: p.tk.secondary});
  p.y += 30;

  // table header
  text(p, t('kh.installments'), p.pad, 13, {weight: 600, color: p.tk.secondary});
  text(p, t('date'), p.pad + 200, 13, {weight: 600, color: p.tk.secondary});
  text(p, t('amount'), W - p.pad, 13, {weight: 600, color: p.tk.secondary, align: 'right'});
  p.y += 10;
  line(p);
  for (let i = 0; i < k; i++) {
    p.y += rowH - 8;
    const mark = e.paid[i];
    text(p, `${t('kh.inst', {i: i + 1})} · ${fmtShortDate(installmentDue(cm, round, i))}`, p.pad, 15);
    text(p, mark ? fmtDateTime(mark.at) : '—', p.pad + 200, 15, {color: p.tk.secondary});
    text(p, money(cm.contribution, sym), W - p.pad - 120, 15, {align: 'right', color: mark ? p.tk.text : p.tk.secondary});
    pill(p, mark ? t('st.paid') : t('st.pending'), W - p.pad, mark ? 'paid' : 'pending', 'right');
    p.y += 8;
  }
  p.y += 6;
  line(p);
  p.y += 30;
  text(p, t('rc.totalPaid'), p.pad, 17, {weight: 600});
  text(p, money(paid * cm.contribution, sym), W - p.pad, 20, {weight: 700, align: 'right'});
  p.y += 28;
  text(p, t('rc.balance'), p.pad, 16, {color: p.tk.secondary});
  text(p, money((k - paid) * cm.contribution, sym), W - p.pad, 16, {align: 'right', color: p.tk.secondary});
  if (e.note) {
    p.y += 32;
    text(p, `${t('notes')}: ${e.note}`.slice(0, 95), p.pad, 15, {color: p.tk.secondary});
  }
  p.y += 16;
  footer(p, data, t);
  return exportCanvas(canvas, `Raseed-${safe(member.name)}-Round-${round}.png`);
}

/** Whole-round khata summary. */
export async function saveRoundSummary(data: KametiData, round: number, t: TFn, sym: string) {
  const cm = data.committee!;
  const rowH = 38;
  const W = 900;
  const H = 360 + data.members.length * rowH;
  const {canvas, c} = makeCanvas(W, H);
  const p: Painter = {c, tk: tokens(), w: W, y: 0, pad: 40};
  c.fillStyle = p.tk.bg;
  c.fillRect(0, 0, W, H);
  header(p, data, t('rc.summary'), round, t);

  const st = roundStats(data, round);
  const winner = winnerOf(data, round);
  p.y += 34;
  const cols = [
    [t('dash.pot'), money(potPerRound(cm, data.members.length), sym)],
    [t('dash.collected'), money(st.collected, sym)],
    [t('dash.remaining'), money(st.remaining, sym)],
    [t('kh.winner'), winner?.name ?? '—'],
  ];
  const cw = (W - p.pad * 2) / 4;
  cols.forEach(([l], i) => text(p, l, p.pad + i * cw, 13, {weight: 600, color: p.tk.secondary}));
  p.y += 26;
  cols.forEach(([, v], i) => text(p, v, p.pad + i * cw, 20, {weight: 700}));
  p.y += 34;

  const x = {name: p.pad, phone: p.pad + 260, paid: p.pad + 430, amt: p.pad + 600};
  text(p, t('member'), x.name, 13, {weight: 600, color: p.tk.secondary});
  text(p, t('phone'), x.phone, 13, {weight: 600, color: p.tk.secondary});
  text(p, t('kh.installments'), x.paid, 13, {weight: 600, color: p.tk.secondary});
  text(p, t('rc.totalPaid'), x.amt, 13, {weight: 600, color: p.tk.secondary});
  text(p, t('status'), W - p.pad, 13, {weight: 600, color: p.tk.secondary, align: 'right'});
  p.y += 10;
  line(p);
  data.members.forEach(m => {
    const e = getEntry(data, round, m.id);
    const pc = paidCount(e);
    const status = pc === cm.installmentsPerRound ? 'paid' : pc > 0 ? 'partial' : 'pending';
    p.y += rowH - 10;
    text(p, m.name + (winner?.id === m.id ? '  ★' : ''), x.name, 16, {weight: 600});
    text(p, m.phone, x.phone, 15, {color: p.tk.secondary});
    text(p, `${pc} / ${cm.installmentsPerRound}`, x.paid, 15);
    text(p, money(pc * cm.contribution, sym), x.amt, 15);
    pill(p, t(`st.${status}`), W - p.pad, status, 'right');
    p.y += 10;
  });
  p.y += 4;
  line(p);
  p.y += 30;
  text(p, `${t('dash.perMember')}: ${money(perMemberPerRound(cm), sym)}`, p.pad, 15, {color: p.tk.secondary});
  text(p, `${t('dash.membersPaid', {p: st.paidMembers, n: data.members.length})}`, W - p.pad, 15, {color: p.tk.secondary, align: 'right'});
  p.y += 14;
  footer(p, data, t);
  return exportCanvas(canvas, `${safe(cm.title)}-Round-${round}-Summary.png`);
}
