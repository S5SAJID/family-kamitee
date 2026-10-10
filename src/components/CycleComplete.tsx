import {useEffect} from 'react';
import {Dialog} from '@astryxdesign/core/Dialog';
import {VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Token} from '@astryxdesign/core/Token';
import {PartyPopper} from 'lucide-react';
import {useStore} from '../lib/store';
import {useData, useMoney, useT} from '../lib/hooks';
import {potPerRound} from '../lib/calc';
import {playReveal} from '../lib/sound';

/** Shown once when every member has received the pot. */
export function CycleComplete() {
  const t = useT();
  const fmt = useMoney();
  const data = useData();
  const sound = useStore(s => s.settings.sound);
  const markCelebrated = useStore(s => s.markCelebrated);
  const setView = useStore(s => s.setView);
  const isOpen = !!data.committee && !!data.completedAt && !data.celebrated;

  useEffect(() => {
    if (isOpen && sound) playReveal();
  }, [isOpen, sound]);

  if (!data.committee) return null;
  const n = data.members.length;
  const pot = potPerRound(data.committee, n);

  return (
    <Dialog isOpen={isOpen} onOpenChange={o => !o && markCelebrated()} width={520} purpose="required">
      <VStack gap={6} padding={8} hAlign="center">
        <Icon icon={PartyPopper} size="lg" color="success" />
        <VStack gap={2} hAlign="center">
          <Heading level={1} type="display-2">
            {t('cc.title')}
          </Heading>
          <Text type="large" justify="center">
            {t('cc.subtitle', {n, pot: fmt(pot)})}
          </Text>
        </VStack>
        <Token size="lg" color="green" label={t('cc.total', {amt: fmt(pot * n)})} />
        <Text color="secondary" justify="center">
          {t('cc.thanks')}
        </Text>
        <VStack gap={2} width="100%">
          <Button
            size="lg"
            variant="primary"
            width="100%"
            label={t('cc.view')}
            onClick={() => {
              markCelebrated();
              setView('history');
            }}
          />
          <Button
            size="lg"
            width="100%"
            label={t('cc.new')}
            onClick={() => {
              markCelebrated();
              setView('settings');
            }}
          />
        </VStack>
      </VStack>
    </Dialog>
  );
}
