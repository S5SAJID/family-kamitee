import {useEffect, useMemo, useState} from 'react';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {VStack, HStack, StackItem} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {ScrollableArea} from '@astryxdesign/core/ScrollableArea';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Stepper, Step} from '@astryxdesign/core/Stepper';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {DateInput} from '@astryxdesign/core/DateInput';
import type {ISODateString} from '@astryxdesign/core/Calendar';
import {Selector} from '@astryxdesign/core/Selector';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Banner} from '@astryxdesign/core/Banner';
import {useToast} from '@astryxdesign/core/Toast';
import {useStore} from '../lib/store';
import {useMoney, useT} from '../lib/hooks';
import {allowedCollections, cycleEnd, defaultInstallments, perMemberPerRound, potPerRound} from '../lib/calc';
import {fmtDate, toISODate, uid} from '../lib/format';
import {PAYOUTS} from '../lib/i18n';
import type {CollectionInterval, Committee, DrawMode, PayoutInterval} from '../lib/types';

interface Draft {
  title: string;
  organizer: string;
  memberCount: number;
  drawMode: DrawMode;
  contribution: number;
  collectionInterval: CollectionInterval;
  payoutInterval: PayoutInterval;
  installmentsPerRound: number;
  startDate: string;
  names: string[];
  phones: string[];
}

const fresh = (): Draft => ({
  title: '',
  organizer: '',
  memberCount: 10,
  drawMode: 'upfront',
  contribution: 10000,
  collectionInterval: 'monthly',
  payoutInterval: 'monthly',
  installmentsPerRound: 1,
  startDate: toISODate(new Date()),
  names: Array(10).fill(''),
  phones: Array(10).fill(''),
});

const resize = (a: string[], n: number) => (a.length >= n ? a.slice(0, n) : [...a, ...Array(n - a.length).fill('')]);

/** 4-step committee setup: Basics → Schedule → Members → Review. */
export function SetupWizard() {
  const t = useT();
  const fmt = useMoney();
  const isOpen = useStore(s => s.setupOpen);
  const setOpen = useStore(s => s.setSetupOpen);
  const createCommittee = useStore(s => s.createCommittee);
  const setView = useStore(s => s.setView);
  const showToast = useToast();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(fresh);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setD(fresh());
      setTried(false);
    }
  }, [isOpen]);

  const patch = (p: Partial<Draft>) => setD(prev => ({...prev, ...p}));

  const preview: Committee = useMemo(
    () => ({
      id: 'preview',
      title: d.title,
      organizer: d.organizer,
      contribution: d.contribution,
      collectionInterval: d.collectionInterval,
      payoutInterval: d.payoutInterval,
      installmentsPerRound: d.installmentsPerRound,
      startDate: d.startDate,
      drawMode: d.drawMode,
      createdAt: new Date().toISOString(),
    }),
    [d],
  );

  const stepValid = [
    d.title.trim().length > 0 && d.memberCount >= 2,
    d.contribution > 0 && d.installmentsPerRound >= 1 && !!d.startDate,
    d.names.every(n => n.trim().length > 0),
    true,
  ];

  const next = () => {
    setTried(true);
    if (!stepValid[step]) return;
    setTried(false);
    setStep(s => s + 1);
  };

  const create = () => {
    const committee: Committee = {...preview, id: uid('kmt'), title: d.title.trim(), organizer: d.organizer.trim()};
    const members = d.names.map((name, i) => ({id: uid('mbr'), name: name.trim(), phone: d.phones[i].trim()}));
    createCommittee(committee, members);
    setOpen(false);
    showToast({body: t('su.created')});
    if (committee.drawMode === 'upfront') {
      setView('draw');
      showToast({body: t('su.drawNow')});
    }
  };

  const setPayout = (p: PayoutInterval) => {
    const allowed = allowedCollections(p);
    const ci = allowed.includes(d.collectionInterval) ? d.collectionInterval : allowed[allowed.length - 1];
    patch({payoutInterval: p, collectionInterval: ci, installmentsPerRound: defaultInstallments(ci, p)});
  };
  const setCollection = (ci: CollectionInterval) =>
    patch({collectionInterval: ci, installmentsPerRound: defaultInstallments(ci, d.payoutInterval)});

  const summary = (
    <MetadataList label={{position: 'start', width: 220}}>
      <MetadataListItem label={t('su.perMember')}>{fmt(perMemberPerRound(preview))}</MetadataListItem>
      <MetadataListItem label={t('su.potPerRound')}>
        <Text weight="bold">{fmt(potPerRound(preview, d.memberCount))}</Text>
      </MetadataListItem>
      <MetadataListItem label={t('su.cycle')}>
        {d.memberCount} × {t(`iv.${d.payoutInterval}`)}
      </MetadataListItem>
      <MetadataListItem label={t('su.ends')}>{d.startDate ? fmtDate(cycleEnd(preview, d.memberCount)) : '—'}</MetadataListItem>
    </MetadataList>
  );

  return (
    <Dialog isOpen={isOpen} onOpenChange={setOpen} width={680} maxHeight="92dvh" purpose="form">
      <DialogHeader title={t('su.title')} onOpenChange={setOpen} />
      <VStack gap={6} padding={6}>
        <Stepper activeStep={step} label={t('su.title')} onStepClick={i => i < step && setStep(i)}>
          <Step step={0} label={t('su.step1')} />
          <Step step={1} label={t('su.step2')} />
          <Step step={2} label={t('su.step3')} />
          <Step step={3} label={t('su.step4')} />
        </Stepper>

        {step === 0 && (
          <FormLayout>
            <TextInput
              label={t('su.name')}
              value={d.title}
              onChange={v => patch({title: v})}
              placeholder="Khandani Kameti - 2026"
              size="lg"
              isRequired
              hasAutoFocus
              status={tried && !d.title.trim() ? {type: 'error'} : undefined}
            />
            <TextInput label={t('su.organizer')} value={d.organizer} onChange={v => patch({organizer: v})} size="lg" isOptional />
            <NumberInput
              label={t('su.memberCount')}
              value={d.memberCount}
              onChange={v => {
                const n = Math.max(2, Math.min(60, Math.round(v || 2)));
                patch({memberCount: n, names: resize(d.names, n), phones: resize(d.phones, n)});
              }}
              min={2}
              max={60}
              size="lg"
              isRequired
            />
            <RadioList label={t('su.drawMode')} value={d.drawMode} onChange={v => patch({drawMode: v as DrawMode})}>
              <RadioListItem value="upfront" label={t('su.drawUpfront')} description={t('su.drawUpfrontDesc')} />
              <RadioListItem value="round" label={t('su.drawRound')} description={t('su.drawRoundDesc')} />
            </RadioList>
          </FormLayout>
        )}

        {step === 1 && (
          <VStack gap={6}>
            <Grid columns={{minWidth: 240, repeat: 'fit'}} gap={4}>
              <NumberInput
                label={t('su.contribution')}
                value={d.contribution}
                onChange={v => patch({contribution: Math.max(0, Math.round(v || 0))})}
                min={1}
                step={500}
                size="lg"
                isRequired
                formatValue={v => fmt(v)}
              />
              <Selector
                label={t('su.payout')}
                value={d.payoutInterval}
                onChange={v => setPayout(v as PayoutInterval)}
                options={PAYOUTS.map(p => ({value: p, label: t(`iv.${p}`)}))}
                size="lg"
              />
              <Selector
                label={t('su.collection')}
                value={d.collectionInterval}
                onChange={v => setCollection(v as CollectionInterval)}
                options={allowedCollections(d.payoutInterval).map(c => ({value: c, label: t(`iv.${c}`)}))}
                size="lg"
              />
              <NumberInput
                label={t('su.installments')}
                description={t('su.installmentsDesc', {iv: t(`iv.${d.collectionInterval}`), piv: t(`iv.${d.payoutInterval}`)})}
                value={d.installmentsPerRound}
                onChange={v => patch({installmentsPerRound: Math.max(1, Math.min(31, Math.round(v || 1)))})}
                min={1}
                max={31}
                size="lg"
              />
              <DateInput label={t('su.start')} value={(d.startDate || undefined) as ISODateString | undefined} onChange={v => patch({startDate: v ?? ''})} size="lg" isRequired />
            </Grid>
            {summary}
          </VStack>
        )}

        {step === 2 && (
          <VStack gap={4}>
            {tried && !stepValid[2] && <Banner status="error" title={t('su.needNames')} />}
            <ScrollableArea label={t('su.step3')} height={d.memberCount > 6 ? 'min(420px, 45dvh)' : undefined}>
              <VStack gap={3} padding={1}>
              {d.names.map((name, i) => (
                <Grid key={i} columns={2} gap={3}>
                  <TextInput
                    label={t('su.memberName', {i: i + 1})}
                    value={name}
                    onChange={v => patch({names: d.names.map((x, j) => (j === i ? v : x))})}
                    size="lg"
                    status={tried && !name.trim() ? {type: 'error'} : undefined}
                  />
                  <TextInput
                    label={t('su.memberPhone')}
                    value={d.phones[i]}
                    onChange={v => patch({phones: d.phones.map((x, j) => (j === i ? v : x))})}
                    placeholder="03xx xxxxxxx"
                    size="lg"
                    isOptional
                  />
                </Grid>
              ))}
              </VStack>
            </ScrollableArea>
          </VStack>
        )}

        {step === 3 && (
          <VStack gap={4}>
            <MetadataList label={{position: 'start', width: 220}}>
              <MetadataListItem label={t('su.name')}>{d.title}</MetadataListItem>
              <MetadataListItem label={t('su.contribution')}>
                {fmt(d.contribution)} · {t(`iv.${d.collectionInterval}`)}
              </MetadataListItem>
              <MetadataListItem label={t('su.installments')}>{d.installmentsPerRound}</MetadataListItem>
              <MetadataListItem label={t('su.start')}>{fmtDate(d.startDate)}</MetadataListItem>
              <MetadataListItem label={t('su.drawMode')}>
                {d.drawMode === 'upfront' ? t('su.drawUpfront') : t('su.drawRound')}
              </MetadataListItem>
              <MetadataListItem label={t('su.memberCount')}>{d.names.join(', ')}</MetadataListItem>
            </MetadataList>
            {summary}
          </VStack>
        )}

        <HStack gap={2} vAlign="center">
          <StackItem size="fill">
            {step > 0 && <Button size="lg" variant="ghost" label={t('back')} icon={<Icon icon="chevronLeft" />} onClick={() => setStep(s => s - 1)} />}
          </StackItem>
          <Button size="lg" label={t('cancel')} onClick={() => setOpen(false)} />
          {step < 3 ? (
            <Button size="lg" variant="primary" label={t('next')} endContent={<Icon icon="chevronRight" />} onClick={next} />
          ) : (
            <Button size="lg" variant="primary" label={t('su.create')} icon={<Icon icon="check" />} onClick={create} />
          )}
        </HStack>
      </VStack>
    </Dialog>
  );
}
