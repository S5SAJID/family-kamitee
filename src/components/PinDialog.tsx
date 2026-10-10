import {useEffect, useState} from 'react';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Center} from '@astryxdesign/core/Center';
import {useToast} from '@astryxdesign/core/Toast';
import {PinPad} from './PinPad';
import {useStore} from '../lib/store';
import {useT} from '../lib/hooks';
import {sha256} from '../lib/platform';

/** Set/change a PIN (enter twice) or remove it (verify current first). */
export function PinDialog({
  mode,
  onClose,
}: {
  mode: 'set' | 'change' | 'remove' | null;
  onClose: () => void;
}) {
  const t = useT();
  const pinHash = useStore(s => s.settings.pinHash);
  const updateSettings = useStore(s => s.updateSettings);
  const showToast = useToast();
  const [step, setStep] = useState<'verify' | 'new' | 'repeat'>('new');
  const [first, setFirst] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (mode) {
      setStep(mode === 'set' ? 'new' : 'verify');
      setFirst('');
      setError(null);
      setResetKey(k => k + 1);
    }
  }, [mode]);

  const retry = (msg: string) => {
    setError(msg);
    setResetKey(k => k + 1);
  };

  const onComplete = async (pin: string) => {
    if (step === 'verify') {
      if ((await sha256(pin)) !== pinHash) return retry(t('pin.wrong'));
      if (mode === 'remove') {
        updateSettings({pinHash: null});
        showToast({body: t('pin.removed')});
        return onClose();
      }
      setError(null);
      setStep('new');
      setResetKey(k => k + 1);
    } else if (step === 'new') {
      setFirst(pin);
      setError(null);
      setStep('repeat');
      setResetKey(k => k + 1);
    } else {
      if (pin !== first) {
        setStep('new');
        return retry(t('pin.mismatch'));
      }
      updateSettings({pinHash: await sha256(pin)});
      showToast({body: t('pin.set')});
      onClose();
    }
  };

  const title = step === 'verify' ? t('pin.enter') : step === 'new' ? t('pin.new') : t('pin.repeat');
  const heading = mode === 'remove' ? t('se.removePin') : mode === 'change' ? t('se.changePin') : t('se.setPin');

  return (
    <Dialog isOpen={mode !== null} onOpenChange={o => !o && onClose()} width={400}>
      <DialogHeader title={heading} onOpenChange={o => !o && onClose()} />
      <Center padding={6}>
        <PinPad title={title} error={error} onComplete={pin => void onComplete(pin)} resetKey={resetKey} />
      </Center>
    </Dialog>
  );
}
