import {useState} from 'react';
import {VStack} from '@astryxdesign/core/Stack';
import {Center} from '@astryxdesign/core/Center';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {LockKeyhole} from 'lucide-react';
import {PinPad} from './PinPad';
import {useStore} from '../lib/store';
import {useT} from '../lib/hooks';
import {sha256} from '../lib/platform';

/** Full-window gate shown on launch when a PIN is set. */
export function LockScreen() {
  const t = useT();
  const pinHash = useStore(s => s.settings.pinHash);
  const setUnlocked = useStore(s => s.setUnlocked);
  const resetAll = useStore(s => s.resetAll);
  const updateSettings = useStore(s => s.updateSettings);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [forgot, setForgot] = useState(false);

  const onComplete = async (pin: string) => {
    if ((await sha256(pin)) === pinHash) {
      setUnlocked(true);
    } else {
      setError(t('pin.wrong'));
      setResetKey(k => k + 1);
    }
  };

  return (
    <Center height="100%" width="100%" padding={6}>
      <VStack gap={8} hAlign="center">
        <VStack gap={2} hAlign="center">
          <Icon icon={LockKeyhole} size="lg" color="secondary" />
          <Heading level={1}>{t('appName')}</Heading>
          <Text color="secondary">{t('appTagline')}</Text>
        </VStack>
        <PinPad title={t('pin.enter')} error={error} onComplete={pin => void onComplete(pin)} resetKey={resetKey} />
        <Button variant="ghost" label={t('pin.forgot')} onClick={() => setForgot(true)} />
      </VStack>
      <AlertDialog
        isOpen={forgot}
        onOpenChange={setForgot}
        title={t('pin.forgot')}
        description={t('pin.forgotDesc')}
        actionLabel={t('pin.erase')}
        cancelLabel={t('cancel')}
        onAction={() => {
          resetAll();
          updateSettings({pinHash: null});
          setUnlocked(true);
          setForgot(false);
        }}
      />
    </Center>
  );
}
