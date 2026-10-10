import {useEffect} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {SideNav, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {Text} from '@astryxdesign/core/Text';
import type {IconType} from '@astryxdesign/core/Icon';
import {
  LayoutDashboard,
  BookOpenCheck,
  Package,
  History,
  Settings as SettingsIcon,
} from 'lucide-react';
import {TitleBar} from './components/TitleBar';
import {SetupWizard} from './components/SetupWizard';
import {LockScreen} from './components/LockScreen';
import {CycleComplete} from './components/CycleComplete';
import {Dashboard} from './views/Dashboard';
import {Khata} from './views/Khata';
import {DrawBox} from './views/DrawBox';
import {History as HistoryView} from './views/History';
import {Settings} from './views/Settings';
import {useStore} from './lib/store';
import {useT} from './lib/hooks';
import type {ViewId} from './lib/types';

const NAV: {id: ViewId; icon: IconType; key: string}[] = [
  {id: 'dashboard', icon: LayoutDashboard, key: 'nav.dashboard'},
  {id: 'khata', icon: BookOpenCheck, key: 'nav.khata'},
  {id: 'draw', icon: Package, key: 'nav.draw'},
  {id: 'history', icon: History, key: 'nav.history'},
];

export default function App() {
  const t = useT();
  const view = useStore(s => s.view);
  const setView = useStore(s => s.setView);
  const collapsed = useStore(s => s.settings.sidebarCollapsed);
  const largeText = useStore(s => s.settings.largeText);
  const updateSettings = useStore(s => s.updateSettings);
  const lang = useStore(s => s.settings.lang);

  // Senior-friendly large text: scale the whole UI uniformly.
  useEffect(() => {
    document.documentElement.style.zoom = largeText ? '1.18' : '';
  }, [largeText]);

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ur-Latn';
  }, [lang]);

  const pinHash = useStore(s => s.settings.pinHash);
  const unlocked = useStore(s => s.unlocked);

  // Locked: keep the title bar (window controls in Tauri) but nothing else.
  if (pinHash && !unlocked) {
    return (
      <AppShell height="fill" variant="elevated" contentPadding={0} topNav={<TitleBar />}>
        <LockScreen />
      </AppShell>
    );
  }

  const page = {
    dashboard: <Dashboard />,
    khata: <Khata />,
    draw: <DrawBox />,
    history: <HistoryView />,
    settings: <Settings />,
  }[view];

  return (
    <AppShell
      height="fill"
      variant="elevated"
      contentPadding={0}
      mobileNav={{breakpoint: 'md'}}
      topNav={<TitleBar />}
      sideNav={
        <SideNav
          collapsible={{
            isCollapsed: collapsed,
            onCollapsedChange: c => updateSettings({sidebarCollapsed: c}),
          }}
          footer={
            collapsed ? undefined : (
              <Text type="supporting" color="secondary">
                {t('se.about')}
              </Text>
            )
          }>
          <SideNavSection title={t('nav.section.main')} isHeaderHidden>
            {NAV.map(item => (
              <SideNavItem
                key={item.id}
                size="lg"
                label={t(item.key)}
                icon={item.icon}
                isSelected={view === item.id}
                onClick={() => setView(item.id)}
              />
            ))}
          </SideNavSection>
          <SideNavSection title={t('nav.section.system')}>
            <SideNavItem
              size="lg"
              label={t('nav.settings')}
              icon={SettingsIcon}
              isSelected={view === 'settings'}
              onClick={() => setView('settings')}
            />
          </SideNavSection>
        </SideNav>
      }>
      {page}
      <SetupWizard />
      <CycleComplete />
    </AppShell>
  );
}
