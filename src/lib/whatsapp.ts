import type {KametiData, Member} from './types';
import type {TFn} from './i18n';
import {getEntry, paidCount, potPerRound, roundStart} from './calc';
import {fmtDate, money, waNumber} from './format';
import {openExternal} from './platform';

type Kind = 'reminder' | 'receipt' | 'winner';

/** Build the pre-formatted message in the current app language. */
export function buildMessage(
  kind: Kind,
  data: KametiData,
  member: Member,
  round: number,
  t: TFn,
  sym: string,
): string {
  const c = data.committee!;
  const e = getEntry(data, round, member.id);
  const paid = paidCount(e);
  const pendingK = c.installmentsPerRound - paid;
  const base = {name: member.name, title: c.title, r: round, org: c.organizer || t('appName')};
  if (kind === 'reminder')
    return t('wa.reminder', {
      ...base,
      pending: money(pendingK * c.contribution, sym),
      k: pendingK,
      amt: money(c.contribution, sym),
    });
  if (kind === 'receipt')
    return t('wa.receipt', {
      ...base,
      paid: money(paid * c.contribution, sym),
      mode: t(`pm.${e.mode}`),
      status:
        pendingK === 0
          ? t('st.paid')
          : `${paid}/${c.installmentsPerRound} · ${t('rc.balance')} ${money(pendingK * c.contribution, sym)}`,
    });
  return t('wa.winner', {
    ...base,
    pot: money(potPerRound(c, data.members.length), sym),
    date: fmtDate(roundStart(c, round)),
  });
}

/** Opens WhatsApp Desktop (if installed) or WhatsApp Web with the text prefilled. */
export function sendWhatsApp(phone: string, text: string) {
  const num = waNumber(phone);
  const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  void openExternal(url);
}
