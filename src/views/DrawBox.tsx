import {useEffect, useRef, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Center} from '@astryxdesign/core/Center';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Switch} from '@astryxdesign/core/Switch';
import {List, ListItem} from '@astryxdesign/core/List';
import {LayoutPanel} from '@astryxdesign/core/Layout';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Dialog} from '@astryxdesign/core/Dialog';
import {Token} from '@astryxdesign/core/Token';
import {Spinner} from '@astryxdesign/core/Spinner';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Sparkles, Shuffle, Package, MessageCircle, ShieldCheck} from 'lucide-react';
import {PageFrame} from '../components/PageFrame';
import {BallotBox, type BallotBoxHandle} from '../components/BallotBox';
import {useData, useMoney, useT} from '../lib/hooks';
import {useStore} from '../lib/store';
import {eligibleMembers, nextUndrawnRound, potPerRound, roundStart, secureRandomInt, secureShuffle} from '../lib/calc';
import {fmtDate, fmtShortDate} from '../lib/format';
import {playReveal, playShuffle, playTick, playUnfold} from '../lib/sound';
import {buildMessage, sendWhatsApp} from '../lib/whatsapp';
import type {Draw} from '../lib/types';

type Phase = 'idle' | 'shuffling' | 'revealing';

export function DrawBox() {
  const t = useT();
  const fmt = useMoney();
  const data = useData();
  const sound = useStore(s => s.settings.sound);
  const sym = useStore(s => s.settings.currency);
  const updateSettings = useStore(s => s.updateSettings);
  const recordDraws = useStore(s => s.recordDraws);
  const isNarrow = useMediaQuery('(max-width: 1024px)');
  const box = useRef<BallotBoxHandle>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [confirm, setConfirm] = useState<'one' | 'all' | null>(null);
  const [result, setResult] = useState<Draw[] | null>(null);
  const [revealed, setRevealed] = useState(0);
  // Rounds already recorded but not yet revealed on screen (no spoilers).
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  const c = data.committee;
  const eligible = eligibleMembers(data);
  const next = nextUndrawnRound(data);
  const n = data.members.length;
  const canPickOne = next !== null && next <= data.currentRound;
  const visibleCount = eligible.length + hidden.size;

  // Progressive reveal of a full-cycle draw.
  useEffect(() => {
    if (!result || result.length < 2 || revealed >= result.length) return;
    const id = setTimeout(() => {
      setRevealed(v => v + 1);
      if (sound) playTick();
    }, 550);
    return () => clearTimeout(id);
  }, [result, revealed, sound]);

  useEffect(() => {
    if (result && revealed >= result.length) setHidden(new Set());
  }, [result, revealed]);

  if (!c) {
    return (
      <PageFrame title={t('dr.title')}>
        <EmptyState icon={<Icon icon={Package} size="lg" />} title={t('dash.noCommitteeTitle')} />
      </PageFrame>
    );
  }

  const run = async (mode: 'one' | 'all') => {
    setConfirm(null);
    if (!next || eligible.length === 0) return;
    // Decide and persist FIRST (crypto-random, final), then animate the reveal.
    let draws: Draw[];
    const at = new Date().toISOString();
    if (mode === 'one') {
      const w = eligible[secureRandomInt(eligible.length)];
      draws = [{round: next, memberId: w.id, at, method: 'single'}];
    } else {
      const order = secureShuffle(eligible);
      const open: number[] = [];
      const taken = new Set(data.draws.map(d => d.round));
      for (let r = 1; r <= n; r++) if (!taken.has(r)) open.push(r);
      draws = order.map((m, i) => ({round: open[i], memberId: m.id, at, method: 'upfront'}));
    }
    setHidden(new Set(draws.map(d => d.round)));
    recordDraws(draws);

    setPhase('shuffling');
    if (sound) playShuffle(2400);
    await box.current?.shuffle(2400);
    setPhase('revealing');
    if (sound) playUnfold();
    await box.current?.rise();
    if (sound) playReveal();
    setRevealed(draws.length === 1 ? 1 : 0);
    setResult(draws);
    if (draws.length === 1) setHidden(new Set());
    setPhase('idle');
  };

  const closeResult = () => {
    setResult(null);
    setHidden(new Set());
    box.current?.reset();
  };

  const memberName = (id: string) => data.members.find(m => m.id === id)?.name ?? '?';
  const busy = phase !== 'idle';

  const sequence = (
    <List
      hasDividers
      density="balanced"
      header={
        <Heading level={3}>
          {t('dr.sequence')}
        </Heading>
      }>
      {Array.from({length: n}, (_, i) => {
        const r = i + 1;
        const d = hidden.has(r) ? undefined : data.draws.find(x => x.round === r);
        const name = d ? memberName(d.memberId) : null;
        return (
          <ListItem
            key={r}
            label={name ?? t('st.inBox')}
            description={`${t('round')} ${r} · ${fmtShortDate(roundStart(c, r))}`}
            startContent={name ? <Avatar name={name} size="md" tooltip={false} /> : <Icon icon={Package} color="secondary" />}
            endContent={r === data.currentRound ? <Token size="sm" color="blue" label={t('st.current')} /> : undefined}
          />
        );
      })}
    </List>
  );

  const single = result && result.length === 1 ? result[0] : null;
  const singleMember = single ? data.members.find(m => m.id === single.memberId) : null;

  return (
    <PageFrame
      title={t('dr.title')}
      subtitle={t('dr.subtitle', {n: visibleCount})}
      end={
        isNarrow ? undefined : (
          <LayoutPanel width={340} hasDivider isScrollable label={t('dr.sequence')}>
            {sequence}
          </LayoutPanel>
        )
      }>
      <VStack gap={6}>
        {eligible.length === 0 && hidden.size === 0 ? (
          <EmptyState icon={<Icon icon={Package} size="lg" />} title={t('dr.empty')} description={t('dr.emptyDesc')} />
        ) : (
          <Center>
            <VStack gap={6} hAlign="center" maxWidth={520} width="100%">
              <Center height={320} width="100%">
                <BallotBox ref={box} count={visibleCount} label={t('dr.inBox')} />
              </Center>
              <HStack gap={2} vAlign="center" hAlign="center">
                {busy && <Spinner size="sm" />}
                <Text type="large" weight="semibold" justify="center">
                  {phase === 'shuffling'
                    ? t('dr.drawing')
                    : phase === 'revealing'
                      ? t('dr.revealing')
                      : `${visibleCount} · ${t('dr.inBox')}`}
                </Text>
              </HStack>
              <VStack gap={2} width="100%">
                {c.drawMode === 'round' || canPickOne ? (
                  <Button
                    variant={c.drawMode === 'round' ? 'primary' : 'secondary'}
                    size="lg"
                    width="100%"
                    label={next ? t('dr.drawRound', {r: next}) : t('dr.empty')}
                    icon={<Icon icon={Sparkles} />}
                    isDisabled={busy || !canPickOne}
                    onClick={() => setConfirm('one')}
                  />
                ) : null}
                {eligible.length > 1 && (
                  <Button
                    variant={c.drawMode === 'upfront' ? 'primary' : 'secondary'}
                    size="lg"
                    width="100%"
                    label={t('dr.drawAll', {n: eligible.length})}
                    icon={<Icon icon={Shuffle} />}
                    isDisabled={busy}
                    onClick={() => setConfirm('all')}
                  />
                )}
              </VStack>
              <HStack gap={2} vAlign="start">
                <Icon icon={ShieldCheck} color="success" />
                <Text color="secondary">
                  {t('dr.final')} {t('dr.fairness')}
                </Text>
              </HStack>
              <Switch label={t('dr.sound')} value={sound} onChange={v => updateSettings({sound: v})} />
            </VStack>
          </Center>
        )}
        {isNarrow && sequence}
      </VStack>

      <AlertDialog
        isOpen={confirm !== null}
        onOpenChange={o => !o && setConfirm(null)}
        title={confirm === 'all' ? t('dr.confirmAllTitle', {n: eligible.length}) : t('dr.confirmTitle', {r: next ?? 0})}
        description={confirm === 'all' ? t('dr.confirmAllDesc') : t('dr.confirmDesc', {n: eligible.length})}
        actionLabel={t('dr.go')}
        actionVariant="primary"
        cancelLabel={t('cancel')}
        onAction={() => void run(confirm ?? 'one')}
      />

      {/* Single reveal */}
      <Dialog isOpen={!!single} onOpenChange={o => !o && closeResult()} width={480} purpose="required">
        {single && singleMember && (
          <VStack gap={6} padding={8} hAlign="center">
            <Text type="large" color="secondary" justify="center">
              {t('dr.winnerIs', {r: single.round})}
            </Text>
            <Avatar name={singleMember.name} size="xl" tooltip={false} />
            <Heading level={1} type="display-2">
              {singleMember.name}
            </Heading>
            <Token size="lg" color="green" label={`${fmt(potPerRound(c, n))} · ${fmtDate(roundStart(c, single.round))}`} />
            <VStack gap={2} width="100%">
              <Button
                size="lg"
                width="100%"
                label={t('kh.whatsapp')}
                icon={<Icon icon={MessageCircle} />}
                isDisabled={!singleMember.phone}
                onClick={() => sendWhatsApp(singleMember.phone, buildMessage('winner', data, singleMember, single.round, t, sym))}
              />
              <Button variant="primary" size="lg" width="100%" label={t('dr.continue')} onClick={closeResult} />
            </VStack>
          </VStack>
        )}
      </Dialog>

      {/* Full-cycle reveal */}
      <Dialog isOpen={!!result && result.length > 1} onOpenChange={o => !o && closeResult()} width={520} purpose="required">
        {result && result.length > 1 && (
          <VStack gap={4} padding={6}>
            <Heading level={2}>{revealed >= result.length ? t('dr.seqDone') : t('dr.revealing')}</Heading>
            <List hasDividers density="balanced">
              {result.slice(0, revealed).map(d => (
                <ListItem
                  key={d.round}
                  label={memberName(d.memberId)}
                  description={`${t('round')} ${d.round} · ${fmtDate(roundStart(c, d.round))}`}
                  startContent={<Avatar name={memberName(d.memberId)} size="md" tooltip={false} />}
                />
              ))}
            </List>
            <Button
              variant="primary"
              size="lg"
              width="100%"
              label={t('dr.continue')}
              isDisabled={revealed < result.length}
              onClick={closeResult}
            />
          </VStack>
        )}
      </Dialog>
    </PageFrame>
  );
}
