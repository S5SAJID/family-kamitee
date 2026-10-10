import {Token} from '@astryxdesign/core/Token';
import {Icon} from '@astryxdesign/core/Icon';
import {Trophy, Package} from 'lucide-react';
import {useT} from '../lib/hooks';
import type {RoundStatusKind} from '../lib/calc';

export type PayStatus = 'paid' | 'partial' | 'pending';

/** High-contrast payment status: icon + text, never color alone. */
export function PayStatusToken({status, size = 'md'}: {status: PayStatus; size?: 'sm' | 'md' | 'lg'}) {
  const t = useT();
  if (status === 'paid') return <Token size={size} color="green" label={t('st.paid')} icon={<Icon icon="success" />} />;
  if (status === 'partial') return <Token size={size} color="orange" label={t('st.partial')} icon={<Icon icon="warning" />} />;
  return <Token size={size} color="red" label={t('st.pending')} icon={<Icon icon="clock" />} />;
}

export function RoundStatusToken({status, size = 'md'}: {status: RoundStatusKind; size?: 'sm' | 'md' | 'lg'}) {
  const t = useT();
  switch (status) {
    case 'handedOver':
      return <Token size={size} color="green" label={t('st.handedOver')} icon={<Icon icon="check" />} />;
    case 'awaitingHandover':
      return <Token size={size} color="yellow" label={t('st.awaitingHandover')} icon={<Icon icon={Trophy} />} />;
    case 'awaitingDraw':
      return <Token size={size} color="purple" label={t('st.awaitingDraw')} icon={<Icon icon={Package} />} />;
    default:
      return <Token size={size} color="gray" label={t('st.upcoming')} icon={<Icon icon="calendar" />} />;
  }
}

export function payStatusOf(paid: number, total: number): PayStatus {
  return paid >= total ? 'paid' : paid > 0 ? 'partial' : 'pending';
}
