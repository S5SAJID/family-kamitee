import {useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {Switch} from '@astryxdesign/core/Switch';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {useToast} from '@astryxdesign/core/Toast';
import {Download, Upload, LockKeyhole, LockKeyholeOpen, RotateCcw, FilePlus2} from 'lucide-react';
import {PAGE_WIDTH, PageFrame} from '../components/PageFrame';
import {PinDialog} from '../components/PinDialog';
import {useData, useMoney, useT} from '../lib/hooks';
import {BACKUP_FORMAT, isValidBackup, selectData, useStore} from '../lib/store';
import {cycleEnd, perMemberPerRound, potPerRound} from '../lib/calc';
import {fmtDate, toISODate} from '../lib/format';
import {pickTextFile, saveFile} from '../lib/platform';
import type {KametiData, Lang} from '../lib/types';

/**
 * Responsive: single column capped at 720px (forms/settings); groups stack.
 * Container escalation: Sections with headings; only the destructive zone is a Card.
 */
export function Settings() {
  const t = useT();
  const fmt = useMoney();
  const data = useData();
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);
  const setLang = useStore(s => s.setLang);
  const importData = useStore(s => s.importData);
  const resetAll = useStore(s => s.resetAll);
  const loadSample = useStore(s => s.loadSample);
  const setSetupOpen = useStore(s => s.setSetupOpen);
  const showToast = useToast();

  const [pinMode, setPinMode] = useState<'set' | 'change' | 'remove' | null>(null);
  const [pendingImport, setPendingImport] = useState<KametiData | null>(null);
  const [confirm, setConfirm] = useState<'fresh' | 'sample' | null>(null);

  const c = data.committee;
  const n = data.members.length;

  const exportBackup = async () => {
    const payload = {format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), data: selectData(useStore.getState())};
    const name = `kameti-backup-${(c?.title ?? 'empty').replace(/[^\w-]+/g, '-').toLowerCase()}-${toISODate(new Date())}.json`;
    const ok = await saveFile(name, new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}), {
      name: 'JSON',
      extensions: ['json'],
    });
    if (ok) showToast({body: t('se.exportOk')});
  };

  const chooseBackup = async () => {
    const text = await pickTextFile();
    if (!text) return;
    try {
      const parsed: unknown = JSON.parse(text);
      if (!isValidBackup(parsed)) throw new Error('invalid');
      setPendingImport(parsed.data);
    } catch {
      showToast({body: t('se.importBad')});
    }
  };

  return (
    <PageFrame title={t('se.title')} subtitle={t('se.subtitle')} contentWidth={PAGE_WIDTH.form}>
      <VStack gap={8}>
        {c && (
            <VStack gap={4}>
              <Heading level={2}>{t('se.committee')}</Heading>
              <MetadataList label={{position: 'start', width: 220}}>
                <MetadataListItem label={t('su.name')}>{c.title}</MetadataListItem>
                {c.organizer && <MetadataListItem label={t('su.organizer')}>{c.organizer}</MetadataListItem>}
                <MetadataListItem label={t('su.contribution')}>
                  {fmt(c.contribution)} · {t(`iv.${c.collectionInterval}`)}
                </MetadataListItem>
                <MetadataListItem label={t('su.payout')}>{t(`iv.${c.payoutInterval}`)}</MetadataListItem>
                <MetadataListItem label={t('su.installments')}>{c.installmentsPerRound}</MetadataListItem>
                <MetadataListItem label={t('su.perMember')}>{fmt(perMemberPerRound(c))}</MetadataListItem>
                <MetadataListItem label={t('su.potPerRound')}>{fmt(potPerRound(c, n))}</MetadataListItem>
                <MetadataListItem label={t('su.memberCount')}>{n}</MetadataListItem>
                <MetadataListItem label={t('su.start')}>{fmtDate(c.startDate)}</MetadataListItem>
                <MetadataListItem label={t('su.ends')}>{fmtDate(cycleEnd(c, n))}</MetadataListItem>
                <MetadataListItem label={t('su.drawMode')}>
                  {c.drawMode === 'upfront' ? t('su.drawUpfront') : t('su.drawRound')}
                </MetadataListItem>
              </MetadataList>
            </VStack>
        )}

        <Divider />

        <VStack gap={4}>
          <Heading level={2}>{t('se.preferences')}</Heading>
          <VStack gap={2}>
            <Text weight="semibold">{t('se.language')}</Text>
            <SegmentedControl label={t('se.language')} value={settings.lang} onChange={v => setLang(v as Lang)} size="lg">
              <SegmentedControlItem value="en" label="English" />
              <SegmentedControlItem value="ru" label="Roman Urdu" />
            </SegmentedControl>
          </VStack>
          <VStack gap={2}>
            <Text weight="semibold">{t('se.currency')}</Text>
            <SegmentedControl
              label={t('se.currency')}
              value={settings.currency}
              onChange={v => updateSettings({currency: v as typeof settings.currency})}
              size="lg">
              <SegmentedControlItem value="Rs." label="Rs. 1,00,000" />
              <SegmentedControlItem value="₨" label="₨ 1,00,000" />
            </SegmentedControl>
          </VStack>
          <Switch
            label={t('se.largeText')}
            description={t('se.largeTextDesc')}
            value={settings.largeText}
            onChange={v => updateSettings({largeText: v})}
            labelPosition="start"
            labelSpacing="spread"
            width="100%"
          />
          <Switch
            label={t('se.sound')}
            value={settings.sound}
            onChange={v => updateSettings({sound: v})}
            labelPosition="start"
            labelSpacing="spread"
            width="100%"
          />
        </VStack>

        <Divider />

        <VStack gap={4}>
          <Heading level={2}>{t('se.security')}</Heading>
          <HStack gap={3} vAlign="center">
            <Icon icon={settings.pinHash ? LockKeyhole : LockKeyholeOpen} color={settings.pinHash ? 'success' : 'secondary'} />
            <VStack gap={0}>
              <Text weight="semibold">{settings.pinHash ? t('se.pinOn') : t('se.pinOff')}</Text>
              <Text color="secondary">{t('se.pinDesc')}</Text>
            </VStack>
          </HStack>
          <HStack gap={2} wrap="wrap">
            {settings.pinHash ? (
              <>
                <Button size="lg" label={t('se.changePin')} onClick={() => setPinMode('change')} />
                <Button size="lg" variant="ghost" label={t('se.removePin')} onClick={() => setPinMode('remove')} />
              </>
            ) : (
              <Button size="lg" variant="primary" label={t('se.setPin')} icon={<Icon icon={LockKeyhole} />} onClick={() => setPinMode('set')} />
            )}
          </HStack>
        </VStack>

        <Divider />

        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>{t('se.backup')}</Heading>
            <Text color="secondary">{t('se.backupDesc')}</Text>
          </VStack>
          <HStack gap={2} wrap="wrap">
            <Button size="lg" variant="primary" label={t('se.export')} icon={<Icon icon={Download} />} isDisabled={!c} clickAction={exportBackup} />
            <Button size="lg" label={t('se.import')} icon={<Icon icon={Upload} />} clickAction={chooseBackup} />
          </HStack>
          <Text type="supporting" color="secondary">
            {t('se.storageDesc')}
          </Text>
        </VStack>

        <Card variant="red" padding={6}>
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>{t('se.danger')}</Heading>
              <Text>{t('se.dangerDesc')}</Text>
            </VStack>
            <HStack gap={2} wrap="wrap">
              <Button size="lg" variant="destructive" label={t('se.startFresh')} icon={<Icon icon={FilePlus2} />} onClick={() => setConfirm('fresh')} />
              <Button size="lg" label={t('se.loadSample')} icon={<Icon icon={RotateCcw} />} onClick={() => setConfirm('sample')} />
            </HStack>
          </VStack>
        </Card>

        <Text type="supporting" color="secondary" justify="center">
          {t('se.about')}
        </Text>
      </VStack>

      <PinDialog mode={pinMode} onClose={() => setPinMode(null)} />

      <AlertDialog
        isOpen={!!pendingImport}
        onOpenChange={o => !o && setPendingImport(null)}
        title={t('se.importConfirm')}
        description={t('se.importDesc')}
        actionLabel={t('se.import')}
        cancelLabel={t('cancel')}
        onAction={() => {
          if (pendingImport) importData(pendingImport);
          setPendingImport(null);
          showToast({body: t('se.importOk')});
        }}
      />
      <AlertDialog
        isOpen={confirm !== null}
        onOpenChange={o => !o && setConfirm(null)}
        title={confirm === 'sample' ? `${t('se.loadSample')}?` : t('se.startFreshConfirm')}
        description={t('se.startFreshDesc')}
        actionLabel={confirm === 'sample' ? t('se.loadSample') : t('se.startFresh')}
        cancelLabel={t('cancel')}
        onAction={() => {
          if (confirm === 'sample') loadSample();
          else {
            resetAll();
            setSetupOpen(true);
          }
          setConfirm(null);
        }}
      />
    </PageFrame>
  );
}
