import {useCallback, useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Delete} from 'lucide-react';
import {useT} from '../lib/hooks';

const LEN = 4;

/**
 * 4-digit PIN entry: big on-screen keypad + physical keyboard support.
 * Calls onComplete when 4 digits are entered; parent decides success/failure
 * and bumps `resetKey` to clear.
 */
export function PinPad({
  title,
  error,
  onComplete,
  resetKey,
}: {
  title: string;
  error?: string | null;
  onComplete: (pin: string) => void;
  resetKey?: number;
}) {
  const t = useT();
  const [pin, setPin] = useState('');

  useEffect(() => setPin(''), [resetKey]);

  const press = useCallback(
    (d: string) => {
      setPin(p => {
        if (p.length >= LEN) return p;
        const next = p + d;
        if (next.length === LEN) setTimeout(() => onComplete(next), 120);
        return next;
      });
    },
    [onComplete],
  );
  const back = useCallback(() => setPin(p => p.slice(0, -1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, back]);

  return (
    <VStack gap={6} hAlign="center" width={280}>
      <VStack gap={2} hAlign="center">
        <Heading level={2}>{title}</Heading>
        <HStack gap={3} role="status" aria-label={`${pin.length} / ${LEN}`}>
          {Array.from({length: LEN}, (_, i) => (
            <StatusDot key={i} variant={i < pin.length ? (error ? 'error' : 'accent') : 'neutral'} label={i < pin.length ? '●' : '○'} />
          ))}
        </HStack>
        <HStack gap={1} vAlign="center" hAlign="center" minHeight={20} role="alert">
          {error && (
            <>
              <Icon icon="error" color="error" size="sm" />
              <Text weight="semibold">{error}</Text>
            </>
          )}
        </HStack>
      </VStack>
      <Grid columns={3} gap={3} width="100%">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <Button key={d} size="lg" label={d} onClick={() => press(d)} width="100%" />
        ))}
        <IconButton size="lg" variant="ghost" label={t('pin.clear')} icon={<Icon icon="close" />} onClick={() => setPin('')} />
        <Button size="lg" label="0" onClick={() => press('0')} width="100%" />
        <IconButton size="lg" variant="ghost" label={t('pin.back')} icon={<Icon icon={Delete} />} onClick={back} />
      </Grid>
    </VStack>
  );
}
