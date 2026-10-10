import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Icon, type IconType} from '@astryxdesign/core/Icon';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Button} from '@astryxdesign/core/Button';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {Table, pixel, proportional} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {List, ListItem} from '@astryxdesign/core/List';
import {Section} from '@astryxdesign/core/Section';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {History as HistoryIcon, Sparkles, Shuffle, HandCoins, UserPen, Upload, Flag, PartyPopper} from 'lucide-react';
import {PageFrame} from '../components/PageFrame';
import {RoundStatusToken} from '../components/Status';
import {useData, useMoney, useT} from '../lib/hooks';
import {roundEnd, roundStart, roundStats, roundStatus, winnerOf} from '../lib/calc';
import {fmtDate, fmtDateTime, fmtShortDate} from '../lib/format';
import type {LogType, Member} from '../lib/types';

interface RoundRow extends Record<string, unknown> {
  round: number;
}

const LOG_ICON: Record<LogType, IconType | 'check' | 'clock'> = {
  setup: Flag,
  draw: Sparkles,
  drawAll: Shuffle,
  paid: 'check',
  unpaid: 'clock',
  handover: HandCoins,
  complete: PartyPopper,
  import: Upload,
  member: UserPen,
};

const PAGE = 100;

export function History() {
  const t = useT();
  const fmt = useMoney();
  const data = useData();
  const [tab, setTab] = useState<'rounds' | 'log'>('rounds');
  const [limit, setLimit] = useState(PAGE);

  const c = data.committee;
  const n = data.members.length;
  const rows: RoundRow[] = useMemo(() => Array.from({length: n}, (_, i) => ({round: i + 1})), [n]);
  const log = useMemo(() => [...data.log].reverse(), [data.log]);
  const byId = useMemo(() => new Map<string, Member>(data.members.map(m => [m.id, m])), [data.members]);

  if (!c) {
    return (
      <PageFrame title={t('hi.title')}>
        <EmptyState icon={<Icon icon={HistoryIcon} size="lg" />} title={t('dash.noCommitteeTitle')} />
      </PageFrame>
    );
  }

  const columns: TableColumn<RoundRow>[] = [
    {
      key: 'round',
      header: t('round'),
      width: pixel(150),
      renderCell: ({round}) => (
        <VStack gap={0}>
          <Text weight="semibold">
            {t('round')} {round}
          </Text>
          <Text type="supporting">
            {fmtShortDate(roundStart(c, round))} – {fmtShortDate(roundEnd(c, round))}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'winner',
      header: t('kh.winner'),
      width: proportional(1, {minWidth: 180}),
      renderCell: ({round}) => {
        const w = winnerOf(data, round);
        return w ? (
          <HStack gap={2} vAlign="center">
            <Avatar name={w.name} size="sm" tooltip={false} />
            <Text>{w.name}</Text>
          </HStack>
        ) : (
          <Text color="secondary">{t('st.inBox')}</Text>
        );
      },
    },
    {
      key: 'collected',
      header: t('dash.collected'),
      width: proportional(1, {minWidth: 200}),
      renderCell: ({round}) => {
        if (round > data.currentRound) return <Text color="secondary">—</Text>;
        const s = roundStats(data, round);
        return (
          <VStack gap={1}>
            <Text>
              {fmt(s.collected)} / {fmt(s.target)}
            </Text>
            <ProgressBar label={t('dash.collected')} isLabelHidden value={s.collected} max={s.target} variant={s.remaining === 0 ? 'success' : 'accent'} />
          </VStack>
        );
      },
    },
    {
      key: 'handover',
      header: t('hi.handover'),
      width: proportional(0.8, {minWidth: 150}),
      renderCell: ({round}) => {
        const meta = data.rounds[round];
        return meta?.handedOverAt ? (
          <VStack gap={0}>
            <Text>{fmtDate(meta.handedOverAt)}</Text>
            {meta.handoverMode && <Text type="supporting">{t(`pm.${meta.handoverMode}`)}</Text>}
          </VStack>
        ) : (
          <Text color="secondary">—</Text>
        );
      },
    },
    {
      key: 'status',
      header: t('status'),
      width: pixel(190),
      renderCell: ({round}) => <RoundStatusToken status={roundStatus(data, round)} />,
    },
  ];

  const logText = (e: (typeof log)[number]) =>
    t(`log.${e.type}`, {
      r: e.round ?? '',
      m: e.memberId ? (byId.get(e.memberId)?.name ?? '?') : '',
      d: e.detail ?? '',
    });

  return (
    <PageFrame title={t('hi.title')} subtitle={t('hi.subtitle')}>
      <VStack gap={4}>
        <TabList value={tab} onChange={v => setTab(v as typeof tab)} hasDivider>
          <Tab value="rounds" label={`${t('hi.rounds')} (${n})`} />
          <Tab value="log" label={`${t('hi.log')} (${log.length})`} />
        </TabList>
        {tab === 'rounds' ? (
          <Table<RoundRow> data={rows} columns={columns} idKey="round" density="balanced" hasHover />
        ) : log.length === 0 ? (
          <EmptyState isCompact title={t('hi.noLog')} />
        ) : (
          <VStack gap={4}>
            <Section padding={0}>
              <List hasDividers density="balanced">
                {log.slice(0, limit).map(e => (
                  <ListItem
                    key={e.id}
                    label={logText(e)}
                    description={fmtDateTime(e.at)}
                    startContent={
                      <Icon
                        icon={LOG_ICON[e.type]}
                        color={e.type === 'paid' ? 'success' : e.type === 'unpaid' ? 'warning' : 'secondary'}
                      />
                    }
                  />
                ))}
              </List>
            </Section>
            {limit < log.length && (
              <HStack hAlign="center">
                <Button variant="ghost" label={t('hi.more')} onClick={() => setLimit(l => l + PAGE)} />
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </PageFrame>
  );
}
