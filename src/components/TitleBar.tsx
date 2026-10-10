import type {MouseEvent} from 'react';
import {TopNav, TopNavHeading} from '@astryxdesign/core/TopNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {HStack} from '@astryxdesign/core/Stack';
import {Token} from '@astryxdesign/core/Token';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Divider} from '@astryxdesign/core/Divider';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Lock, Minus, Square, Vote, PartyPopper} from 'lucide-react';
import {useStore} from '../lib/store';
import {useT} from '../lib/hooks';
import {isTauri, windowControls} from '../lib/platform';
import type {Lang} from '../lib/types';

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [role="radio"], [role="radiogroup"], [role="menuitem"]';

/**
 * Native-like window header. The app window is frameless in Tauri
 * (decorations: false) so this bar provides drag-to-move, double-click to
 * maximize and the Windows caption buttons.
 */
export function TitleBar() {
  const t = useT();
  const committee = useStore(s => s.committee);
  const memberCount = useStore(s => s.members.length);
  const currentRound = useStore(s => s.currentRound);
  const completedAt = useStore(s => s.completedAt);
  const lang = useStore(s => s.settings.lang);
  const hasPin = useStore(s => !!s.settings.pinHash);
  const setLang = useStore(s => s.setLang);
  const setUnlocked = useStore(s => s.setUnlocked);
  const desktop = isTauri();

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(INTERACTIVE)) return;
    if (e.detail === 2) void windowControls.toggleMaximize();
    else void windowControls.startDragging();
  };

  return (
    <TopNav
      label="Window header"
      onMouseDown={onMouseDown}
      heading={
        <TopNavHeading
          logo={<NavIcon icon={<Icon icon={Vote} />} />}
          superheading={t('appName')}
          heading={committee?.title ?? t('hdr.noCommittee')}
        />
      }
      centerContent={
        committee ? (
          completedAt ? (
            <Token size="lg" color="green" label={t('hdr.complete')} icon={<Icon icon={PartyPopper} />} />
          ) : (
            <Token
              size="lg"
              color="blue"
              label={t('hdr.round', {r: currentRound, n: memberCount})}
            />
          )
        ) : undefined
      }
      endContent={
        <HStack gap={2} vAlign="center">
          <SegmentedControl
            label="Language / Zubaan"
            value={lang}
            onChange={v => setLang(v as Lang)}
            size="sm">
            <SegmentedControlItem value="en" label="English" />
            <SegmentedControlItem value="ru" label="Roman Urdu" />
          </SegmentedControl>
          {hasPin && (
            <IconButton
              label={t('hdr.lock')}
              tooltip={t('hdr.lock')}
              variant="ghost"
              size="sm"
              icon={<Icon icon={Lock} />}
              onClick={() => setUnlocked(false)}
            />
          )}
          {desktop && (
            <>
              <Divider orientation="vertical" />
              <IconButton label="Minimize" size="sm" variant="ghost" icon={<Icon icon={Minus} />} onClick={() => void windowControls.minimize()} />
              <IconButton label="Maximize" size="sm" variant="ghost" icon={<Icon icon={Square} />} onClick={() => void windowControls.toggleMaximize()} />
              <IconButton label="Close" size="sm" variant="ghost" icon={<Icon icon="close" />} onClick={() => void windowControls.close()} />
            </>
          )}
        </HStack>
      }
    />
  );
}
