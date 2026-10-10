import {useMemo} from 'react';
import {useStore, selectData} from './store';
import {makeT} from './i18n';
import {money} from './format';
import type {KametiData} from './types';
import {useShallow} from 'zustand/react/shallow';

export function useT() {
  const lang = useStore(s => s.settings.lang);
  return useMemo(() => makeT(lang), [lang]);
}

export function useMoney() {
  const sym = useStore(s => s.settings.currency);
  return useMemo(() => (n: number) => money(n, sym), [sym]);
}

export function useData(): KametiData {
  return useStore(useShallow(selectData));
}
