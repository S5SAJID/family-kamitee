import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Avatar} from '@astryxdesign/core/Avatar';
import {InstallmentToggle} from '../components/InstallmentToggle';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Toolbar} from '@astryxdesign/core/Toolbar';
import {Selector} from '@astryxdesign/core/Selector';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Table, pixel, proportional} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {LayoutPanel} from '@astryxdesign/core/Layout';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Token} from '@astryxdesign/core/Token';
import {useToast} from '@astryxdesign/core/Toast';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {UserPlus, ImageDown, Trophy, BookOpenCheck} from 'lucide-react';
import {PAGE_WIDTH, PageFrame} from '../components/PageFrame';
import {PayStatusToken, payStatusOf} from '../components/Status';
import {MemberDetail} from '../components/MemberDetail';
import {MemberDialog} from '../components/MemberDialog';
import {useData, useT} from '../lib/hooks';
import {useStore} from '../lib/store';
import {getEntry, installmentDue, paidCount, roundEnd, roundStart, winnerOf} from '../lib/calc';
import {fmtShortDate} from '../lib/format';
import {saveRoundSummary} from '../lib/receipt';
import type {Member} from '../lib/types';

interface Row extends Record<string, unknown> {
  id: string;
  member: Member;
  paid: number;
}

/** Above this many installments per round, the row shows progress instead of one toggle per installment. */
const MAX_INLINE_TOGGLES = 5;

export function Khata() {
  const t = useT();
  const data = useData();
  const sym = useStore(s => s.settings.currency);
  const togglePaid = useStore(s => s.togglePaid);
  const showToast = useToast();
  const isNarrow = useMediaQuery('(max-width: 1024px)');
  const [round, setRound] = useState(data.currentRound);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberDialog, setMemberDialog] = useState<{open: boolean; member: Member | null}>({open: false, member: null});

  const c = data.committee;
  const viewRound = Math.min(round, data.currentRound);

  const rows: Row[] = useMemo(() => {
    if (!c) return [];
    const q = query.trim().toLowerCase();
    return data.members
      .map(m => ({id: m.id, member: m, paid: paidCount(getEntry(data, viewRound, m.id))}))
      .filter(r => !q || r.member.name.toLowerCase().includes(q) || r.member.phone.includes(q))
      .filter(r =>
        filter === 'all' ? true : filter === 'paid' ? r.paid === c.installmentsPerRound : r.paid < c.installmentsPerRound,
      );
  }, [data, c, viewRound, query, filter]);

  if (!c) {
    return (
      <PageFrame title={t('kh.title')}>
        <EmptyState icon={<Icon icon={BookOpenCheck} size="lg" />} title={t('dash.noCommitteeTitle')} />
      </PageFrame>
    );
  }

  const total = c.installmentsPerRound;
  const winner = winnerOf(data, viewRound);
  const selected = data.members.find(m => m.id === selectedId) ?? null;
  const canAdd = data.draws.length === 0;

  const columns: TableColumn<Row>[] = [
    {
      key: 'member',
      header: t('member'),
      width: proportional(1, {minWidth: 200}),
      renderCell: row => (
        <HStack gap={3} vAlign="center">
          <Avatar name={row.member.name} size="md" tooltip={false} />
          <VStack gap={0}>
            <HStack gap={2} vAlign="center">
              <Text weight="semibold">{row.member.name}</Text>
              {winner?.id === row.member.id && <Icon icon={Trophy} size="sm" color="warning" label={t('kh.winner')} />}
            </HStack>
            <Text type="supporting">{row.member.phone}</Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'paid',
      header: t('kh.installments'),
      width: proportional(2, {minWidth: 260}),
      renderCell: row => {
        const e = getEntry(data, viewRound, row.member.id);
        if (total > MAX_INLINE_TOGGLES) {
          return (
            <VStack gap={1}>
              <ProgressBar label={t('kh.installments')} isLabelHidden value={row.paid} max={total} variant={row.paid === total ? 'success' : 'accent'} />
              <Text type="supporting">
                {row.paid} / {total}
              </Text>
            </VStack>
          );
        }
        return (
          <HStack gap={1} wrap="wrap">
            {e.paid.map((mark, i) => (
              <InstallmentToggle
                key={i}
                isPaid={!!mark}
                text={fmtShortDate(installmentDue(c, viewRound, i))}
                label={`${row.member.name} · ${t('kh.inst', {i: i + 1})} · ${mark ? t('st.paid') : t('st.pending')}`}
                onToggle={() => togglePaid(viewRound, row.member.id, i)}
              />
            ))}
          </HStack>
        );
      },
    },
    {
      key: 'status',
      header: t('status'),
      width: pixel(140),
      renderCell: row => <PayStatusToken status={payStatusOf(row.paid, total)} />,
    },
    {
      key: 'open',
      header: '',
      width: pixel(64),
      align: 'end',
      renderCell: row => (
        <IconButton
          label={`${t('edit')} · ${row.member.name}`}
          tooltip={t('notes')}
          variant={selectedId === row.member.id ? 'secondary' : 'ghost'}
          icon={<Icon icon="chevronRight" />}
          onClick={() => setSelectedId(row.member.id)}
        />
      ),
    },
  ];

  const detail = selected ? (
    <MemberDetail member={selected} round={viewRound} onEdit={() => setMemberDialog({open: true, member: selected})} onClose={isNarrow ? undefined : () => setSelectedId(null)} />
  ) : null;

  return (
    <PageFrame
      title={t('kh.title')}
      contentWidth={PAGE_WIDTH.wide}
      subtitle={t('kh.subtitle', {r: viewRound, period: `${fmtShortDate(roundStart(c, viewRound))} – ${fmtShortDate(roundEnd(c, viewRound))}`})}
      actions={
        <HStack gap={2}>
          <Button
            size="lg"
            label={t('kh.summaryPng')}
            icon={<Icon icon={ImageDown} />}
            clickAction={async () => {
              if (await saveRoundSummary(data, viewRound, t, sym)) showToast({body: t('rc.saved')});
            }}
          />
          {canAdd && (
            <Button size="lg" variant="primary" label={t('kh.addMember')} icon={<Icon icon={UserPlus} />} onClick={() => setMemberDialog({open: true, member: null})} />
          )}
        </HStack>
      }
      end={
        isNarrow || !detail ? undefined : (
          <LayoutPanel width={380} hasDivider isScrollable label={t('member')}>
            {detail}
          </LayoutPanel>
        )
      }>
      <VStack gap={4}>
        <Toolbar
          label={t('kh.title')}
          size="md"
          gap={2}
          startContent={
            <>
              <Selector
                label={t('kh.viewRound')}
                isLabelHidden
                value={String(viewRound)}
                onChange={v => setRound(Number(v))}
                options={Array.from({length: data.currentRound}, (_, i) => ({
                  value: String(i + 1),
                  label: `${t('round')} ${i + 1}${i + 1 === data.currentRound ? ` · ${t('st.current')}` : ''}`,
                }))}
                width={180}
              />
              <TextInput label={t('kh.search')} isLabelHidden placeholder={t('kh.search')} value={query} onChange={setQuery} startIcon="search" hasClear width={220} />
              <SegmentedControl label={t('status')} value={filter} onChange={v => setFilter(v as typeof filter)}>
                <SegmentedControlItem value="all" label={t('kh.filterAll')} />
                <SegmentedControlItem value="pending" label={t('kh.filterPending')} />
                <SegmentedControlItem value="paid" label={t('kh.filterPaid')} />
              </SegmentedControl>
            </>
          }
        />
        {winner && (
          <HStack gap={2} vAlign="center">
            <Token color="purple" label={`${t('kh.winner')}: ${winner.name}`} icon={<Icon icon={Trophy} />} />
          </HStack>
        )}
        {rows.length === 0 ? (
          <EmptyState isCompact title={t('kh.noMembers')} />
        ) : (
          <Table<Row> data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" hasHover />
        )}
      </VStack>

      {isNarrow && selected && (
        <Dialog isOpen onOpenChange={o => !o && setSelectedId(null)} width={460} purpose="form">
          <DialogHeader title={selected.name} onOpenChange={o => !o && setSelectedId(null)} />
          <VStack padding={4}>{detail}</VStack>
        </Dialog>
      )}

      <MemberDialog
        isOpen={memberDialog.open}
        member={memberDialog.member}
        onOpenChange={o => setMemberDialog(s => ({...s, open: o}))}
      />
    </PageFrame>
  );
}
