import {VStack, HStack, StackItem} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Avatar} from '@astryxdesign/core/Avatar';
import {InstallmentToggle} from './InstallmentToggle';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Selector} from '@astryxdesign/core/Selector';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Token} from '@astryxdesign/core/Token';
import {Divider} from '@astryxdesign/core/Divider';
import {useToast} from '@astryxdesign/core/Toast';
import {Pencil, MessageCircle, ImageDown, Trophy} from 'lucide-react';
import {PayStatusToken, payStatusOf} from './Status';
import {useData, useMoney, useT} from '../lib/hooks';
import {useStore} from '../lib/store';
import {getEntry, installmentDue, paidCount, roundForMember} from '../lib/calc';
import {fmtShortDate} from '../lib/format';
import {PAY_MODES} from '../lib/i18n';
import {buildMessage, sendWhatsApp} from '../lib/whatsapp';
import {saveMemberReceipt} from '../lib/receipt';
import type {Member, PayMode} from '../lib/types';

/** Everything about one member for one round: toggles, mode, note, actions. */
export function MemberDetail({
  member,
  round,
  onEdit,
  onClose,
}: {
  member: Member;
  round: number;
  onEdit: () => void;
  onClose?: () => void;
}) {
  const t = useT();
  const fmt = useMoney();
  const data = useData();
  const sym = useStore(s => s.settings.currency);
  const togglePaid = useStore(s => s.togglePaid);
  const setAllPaid = useStore(s => s.setAllPaid);
  const setEntryMode = useStore(s => s.setEntryMode);
  const setEntryNote = useStore(s => s.setEntryNote);
  const showToast = useToast();
  const c = data.committee!;
  const e = getEntry(data, round, member.id);
  const paid = paidCount(e);
  const total = c.installmentsPerRound;
  const wonRound = roundForMember(data, member.id);

  return (
    <VStack gap={6}>
      <HStack gap={3} vAlign="center">
        <Avatar name={member.name} size="lg" tooltip={false} />
        <StackItem size="fill">
          <VStack gap={1}>
            <Heading level={2}>{member.name}</Heading>
            <Text color="secondary">{member.phone || '—'}</Text>
          </VStack>
        </StackItem>
        <IconButton label={t('kh.editMember')} tooltip={t('edit')} variant="ghost" icon={<Icon icon={Pencil} />} onClick={onEdit} />
        {onClose && <IconButton label={t('close')} tooltip={t('close')} variant="ghost" icon={<Icon icon="close" />} onClick={onClose} />}
      </HStack>

      <HStack gap={2} wrap="wrap" vAlign="center">
        <PayStatusToken status={payStatusOf(paid, total)} size="lg" />
        {wonRound && (
          <Token size="lg" color="purple" label={`${t('st.potReceived')} · ${t('round')} ${wonRound}`} icon={<Icon icon={Trophy} />} />
        )}
      </HStack>

      <VStack gap={3}>
        <Text weight="semibold">
          {t('kh.installments')} · {paid}/{total} · {fmt(paid * c.contribution)}
        </Text>
        <Grid columns={{minWidth: 140, repeat: 'fill'}} gap={2}>
          {e.paid.map((mark, i) => (
            <InstallmentToggle
              key={i}
              size="lg"
              width="100%"
              isPaid={!!mark}
              text={fmtShortDate(installmentDue(c, round, i))}
              label={`${t('kh.inst', {i: i + 1})} · ${mark ? t('st.paid') : t('st.pending')}`}
              onToggle={() => togglePaid(round, member.id, i)}
            />
          ))}
        </Grid>
        {paid < total && (
          <Button size="lg" width="100%" variant="ghost" label={t('kh.markAll')} icon={<Icon icon="checkDouble" />} onClick={() => setAllPaid(round, member.id, true)} />
        )}
      </VStack>

      <Selector
        label={t('mode')}
        value={e.mode}
        onChange={v => setEntryMode(round, member.id, v as PayMode)}
        options={PAY_MODES.map(m => ({value: m, label: t(`pm.${m}`)}))}
        size="lg"
      />
      <TextArea
        label={t('notes')}
        value={e.note}
        onChange={v => setEntryNote(round, member.id, v)}
        placeholder={t('kh.notePlaceholder')}
        rows={3}
        isOptional
      />

      <Divider />
      <VStack gap={2}>
        <Button
          size="lg"
          width="100%"
          label={`${t('kh.whatsapp')} · ${paid < total ? t('st.pending') : t('st.paid')}`}
          icon={<Icon icon={MessageCircle} />}
          isDisabled={!member.phone}
          onClick={() => sendWhatsApp(member.phone, buildMessage(paid < total ? 'reminder' : 'receipt', data, member, round, t, sym))}
        />
        <Button
          size="lg"
          width="100%"
          label={t('kh.receipt')}
          icon={<Icon icon={ImageDown} />}
          clickAction={async () => {
            if (await saveMemberReceipt(data, member, round, t, sym)) showToast({body: t('rc.saved')});
          }}
        />
      </VStack>
    </VStack>
  );
}
