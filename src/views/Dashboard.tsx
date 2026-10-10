import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Avatar} from '@astryxdesign/core/Avatar';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {List, ListItem} from '@astryxdesign/core/List';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Selector} from '@astryxdesign/core/Selector';
import {Banner} from '@astryxdesign/core/Banner';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {useToast} from '@astryxdesign/core/Toast';
import {Package, HandCoins, ArrowRight, Plus, Database, MessageCircle, Sparkles} from 'lucide-react';
import {PAGE_WIDTH, PageFrame} from '../components/PageFrame';
import {PayStatusToken, RoundStatusToken, payStatusOf} from '../components/Status';
import {useData, useMoney, useT} from '../lib/hooks';
import {useStore} from '../lib/store';
import {getEntry, paidCount, potPerRound, roundEnd, roundStart, roundStats, roundStatus, winnerOf} from '../lib/calc';
import {fmtDate, fmtShortDate} from '../lib/format';
import {PAY_MODES} from '../lib/i18n';
import {buildMessage, sendWhatsApp} from '../lib/whatsapp';
import type {PayMode} from '../lib/types';

function Kpi({label, value, children}: {label: string; value: string; children?: React.ReactNode}) {
  return (
    <Card>
      <VStack gap={2}>
        <Text color="secondary">{label}</Text>
        <Heading level={2}>{value}</Heading>
        {children}
      </VStack>
    </Card>
  );
}

export function Dashboard() {
  const t = useT();
  const fmt = useMoney();
  const data = useData();
  const sym = useStore(s => s.settings.currency);
  const setView = useStore(s => s.setView);
  const setSetupOpen = useStore(s => s.setSetupOpen);
  const loadSample = useStore(s => s.loadSample);
  const handover = useStore(s => s.handover);
  const nextRound = useStore(s => s.nextRound);
  const showToast = useToast();
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverMode, setHandoverMode] = useState<PayMode>('cash');
  const [nextOpen, setNextOpen] = useState(false);

  const c = data.committee;
  const n = data.members.length;
  const r = data.currentRound;
  const stats = useMemo(() => (c ? roundStats(data, r) : null), [data, c, r]);

  const pending = useMemo(() => {
    if (!c) return [];
    return data.members
      .map(m => ({m, paid: paidCount(getEntry(data, r, m.id))}))
      .filter(x => x.paid < c.installmentsPerRound)
      .sort((a, b) => a.paid - b.paid);
  }, [data, c, r]);

  if (!c || !stats) {
    return (
      <PageFrame title={t('dash.title')}>
        <EmptyState
          icon={<Icon icon={Package} size="lg" />}
          title={t('dash.noCommitteeTitle')}
          description={t('dash.noCommitteeDesc')}
          actions={
            <>
              <Button variant="primary" size="lg" label={t('dash.create')} icon={<Icon icon={Plus} />} onClick={() => setSetupOpen(true)} />
              <Button size="lg" label={t('dash.loadSample')} icon={<Icon icon={Database} />} onClick={loadSample} />
            </>
          }
        />
      </PageFrame>
    );
  }

  const winner = winnerOf(data, r);
  const status = roundStatus(data, r);
  const pot = potPerRound(c, n);

  // Exactly one primary action: the next step of the round lifecycle.
  let primary: React.ReactNode = null;
  if (data.completedAt) {
    primary = <Button size="lg" label={t('cc.view')} onClick={() => setView('history')} />;
  } else if (!winner) {
    primary = <Button variant="primary" size="lg" label={t('dash.goDraw')} icon={<Icon icon={Sparkles} />} onClick={() => setView('draw')} />;
  } else if (status !== 'handedOver') {
    primary = <Button variant="primary" size="lg" label={t('dash.handover')} icon={<Icon icon={HandCoins} />} onClick={() => setHandoverOpen(true)} />;
  } else if (r < n) {
    primary = <Button variant="primary" size="lg" label={t('dash.nextRound')} icon={<Icon icon={ArrowRight} />} onClick={() => setNextOpen(true)} />;
  }

  return (
    <PageFrame
      title={`${t('round')} ${r} / ${n}`}
      subtitle={`${c.title} · ${fmtShortDate(roundStart(c, r))} – ${fmtDate(roundEnd(c, r))}`}
      actions={primary}
      contentWidth={PAGE_WIDTH.overview}>
      <VStack gap={8}>
        <Grid columns={{minWidth: 220, repeat: 'fit'}} gap={4}>
          <Kpi label={t('dash.pot')} value={fmt(pot)} />
          <Kpi label={t('dash.collected')} value={fmt(stats.collected)}>
            <ProgressBar
              label={t('dash.collected')}
              isLabelHidden
              value={stats.collected}
              max={stats.target}
              variant={stats.remaining === 0 ? 'success' : 'accent'}
            />
          </Kpi>
          <Kpi label={t('dash.remaining')} value={fmt(stats.remaining)} />
        </Grid>

        <>
          <VStack gap={3}>
            <Heading level={3}>{t('dash.thisRound')}</Heading>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <Avatar name={winner?.name ?? '?'} size="lg" tooltip={false} />
              <VStack gap={1}>
                <Text type="large" weight="semibold">
                  {winner?.name ?? t('dash.noWinnerYet')}
                </Text>
                <Text color="secondary">{fmt(pot)}</Text>
              </VStack>
              <RoundStatusToken status={status} size="lg" />
            </HStack>
          </VStack>
        </>

        <>
          <List
            hasDividers
            header={
              <HStack hAlign="between" vAlign="center">
                <Heading level={3}>
                  {t('dash.pendingList')} ({pending.length})
                </Heading>
                <Button variant="ghost" label={t('dash.viewKhata')} endContent={<Icon icon="chevronRight" />} onClick={() => setView('khata')} />
              </HStack>
            }>
            {pending.length === 0 ? (
              <ListItem label={t('dash.allPaid')} startContent={<Icon icon="success" color="success" />} />
            ) : (
              pending.map(({m, paid}) => (
                <ListItem
                  key={m.id}
                  label={m.name}
                  description={`${t('rc.balance')}: ${fmt((c.installmentsPerRound - paid) * c.contribution)}`}
                  startContent={<Avatar name={m.name} size="md" tooltip={false} />}
                  endContent={
                    <HStack gap={2} vAlign="center">
                      <PayStatusToken status={payStatusOf(paid, c.installmentsPerRound)} />
                      <IconButton
                        label={`${t('kh.whatsapp')} · ${m.name}`}
                        tooltip={t('kh.whatsapp')}
                        variant="ghost"
                        icon={<Icon icon={MessageCircle} />}
                        onClick={() => sendWhatsApp(m.phone, buildMessage('reminder', data, m, r, t, sym))}
                      />
                    </HStack>
                  }
                />
              ))
            )}
          </List>
        </>
      </VStack>

      {winner && (
        <Dialog isOpen={handoverOpen} onOpenChange={setHandoverOpen} width={480} purpose="form">
          <DialogHeader title={t('dash.handoverTitle', {name: winner.name})} onOpenChange={setHandoverOpen} />
          <VStack gap={4} padding={4}>
            <Text>{t('dash.handoverDesc', {r, amt: fmt(pot)})}</Text>
            {stats.remaining > 0 && (
              <Banner status="warning" title={t('dash.handoverWarn', {amt: fmt(stats.remaining)})} collapsible={false} />
            )}
            <Selector
              label={t('mode')}
              value={handoverMode}
              onChange={v => setHandoverMode(v as PayMode)}
              options={PAY_MODES.map(m => ({value: m, label: t(`pm.${m}`)}))}
              size="lg"
            />
            <HStack gap={2} hAlign="end">
              <Button label={t('cancel')} size="lg" onClick={() => setHandoverOpen(false)} />
              <Button
                variant="primary"
                size="lg"
                label={t('dash.handover')}
                icon={<Icon icon={HandCoins} />}
                onClick={() => {
                  handover(r, handoverMode);
                  setHandoverOpen(false);
                  showToast({body: t('dash.handedOverOn', {d: fmtDate(new Date())})});
                }}
              />
            </HStack>
          </VStack>
        </Dialog>
      )}

      <AlertDialog
        isOpen={nextOpen}
        onOpenChange={setNextOpen}
        title={t('dash.nextTitle', {r: r + 1})}
        description={t('dash.nextDesc', {r0: r, r: r + 1})}
        actionLabel={t('dash.nextRound')}
        actionVariant="primary"
        cancelLabel={t('cancel')}
        onAction={() => {
          nextRound();
          setNextOpen(false);
        }}
      />
    </PageFrame>
  );
}
