import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import type {
  Committee,
  Draw,
  KametiData,
  Lang,
  LogEntry,
  Member,
  PayMode,
  Settings,
  ViewId,
} from './types';
import {buildSampleData} from './sample';
import {getEntry, khataKey} from './calc';
import {uid} from './format';

export const STORAGE_KEY = 'kameti-khata-v1';
export const BACKUP_FORMAT = 'kameti-khata-backup';

const emptyData = (): KametiData => ({
  committee: null,
  members: [],
  draws: [],
  khata: {},
  rounds: {},
  currentRound: 1,
  log: [],
  completedAt: null,
  celebrated: false,
});

const defaultSettings: Settings = {
  lang: 'en',
  sound: true,
  largeText: false,
  currency: 'Rs.',
  pinHash: null,
  sidebarCollapsed: false,
};

interface UIState {
  view: ViewId;
  setupOpen: boolean;
  unlocked: boolean;
}

interface Actions {
  setView: (v: ViewId) => void;
  setSetupOpen: (o: boolean) => void;
  setUnlocked: (u: boolean) => void;
  setLang: (l: Lang) => void;
  updateSettings: (s: Partial<Settings>) => void;

  createCommittee: (c: Committee, members: Member[]) => void;
  loadSample: () => void;
  resetAll: () => void;
  importData: (d: KametiData) => void;

  togglePaid: (round: number, memberId: string, idx: number) => void;
  setAllPaid: (round: number, memberId: string, paid: boolean) => void;
  setEntryMode: (round: number, memberId: string, mode: PayMode) => void;
  setEntryNote: (round: number, memberId: string, note: string) => void;

  recordDraws: (draws: Draw[]) => void;
  handover: (round: number, mode: PayMode) => void;
  nextRound: () => void;
  markCelebrated: () => void;

  addMember: (m: Member) => void;
  updateMember: (m: Member) => void;
  removeMember: (id: string) => void;
}

export type Store = KametiData & {settings: Settings} & UIState & Actions;

const log = (entry: Omit<LogEntry, 'id' | 'at'>): LogEntry => ({
  id: uid('log'),
  at: new Date().toISOString(),
  ...entry,
});

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSampleData(),
      settings: defaultSettings,
      view: 'dashboard',
      setupOpen: false,
      unlocked: false,

      setView: view => set({view}),
      setSetupOpen: setupOpen => set({setupOpen}),
      setUnlocked: unlocked => set({unlocked}),
      setLang: lang => set(s => ({settings: {...s.settings, lang}})),
      updateSettings: p => set(s => ({settings: {...s.settings, ...p}})),

      createCommittee: (committee, members) =>
        set({
          ...emptyData(),
          committee,
          members,
          log: [log({type: 'setup', detail: committee.title})],
          view: 'dashboard',
        }),
      loadSample: () => set({...buildSampleData(), view: 'dashboard'}),
      resetAll: () => set({...emptyData(), view: 'dashboard'}),
      importData: d =>
        set({
          ...emptyData(),
          ...d,
          log: [...(d.log ?? []), log({type: 'import'})],
          view: 'dashboard',
        }),

      togglePaid: (round, memberId, idx) => {
        const s = get();
        const e = getEntry(s, round, memberId);
        const paid = e.paid.slice();
        const nowPaid = !paid[idx];
        paid[idx] = nowPaid ? {at: new Date().toISOString(), mode: e.mode} : null;
        set({
          khata: {...s.khata, [khataKey(round, memberId)]: {...e, paid}},
          log: [
            ...s.log,
            log({type: nowPaid ? 'paid' : 'unpaid', round, memberId, detail: String(idx + 1)}),
          ],
        });
      },
      setAllPaid: (round, memberId, value) => {
        const s = get();
        const e = getEntry(s, round, memberId);
        const now = new Date().toISOString();
        const changed: number[] = [];
        const paid = e.paid.map((p, i) => {
          if (value && !p) {
            changed.push(i + 1);
            return {at: now, mode: e.mode};
          }
          if (!value && p) {
            changed.push(i + 1);
            return null;
          }
          return p;
        });
        if (!changed.length) return;
        set({
          khata: {...s.khata, [khataKey(round, memberId)]: {...e, paid}},
          log: [
            ...s.log,
            log({type: value ? 'paid' : 'unpaid', round, memberId, detail: changed.join(', ')}),
          ],
        });
      },
      setEntryMode: (round, memberId, mode) => {
        const s = get();
        const e = getEntry(s, round, memberId);
        set({khata: {...s.khata, [khataKey(round, memberId)]: {...e, mode}}});
      },
      setEntryNote: (round, memberId, note) => {
        const s = get();
        const e = getEntry(s, round, memberId);
        set({khata: {...s.khata, [khataKey(round, memberId)]: {...e, note}}});
      },

      recordDraws: draws => {
        const s = get();
        // Strict: never overwrite an existing draw for a round or member.
        const takenRounds = new Set(s.draws.map(d => d.round));
        const takenMembers = new Set(s.draws.map(d => d.memberId));
        const fresh = draws.filter(d => !takenRounds.has(d.round) && !takenMembers.has(d.memberId));
        if (!fresh.length) return;
        const entries =
          fresh.length === 1
            ? [log({type: 'draw', round: fresh[0].round, memberId: fresh[0].memberId})]
            : [log({type: 'drawAll', detail: String(fresh.length)})];
        set({
          draws: [...s.draws, ...fresh].sort((a, b) => a.round - b.round),
          log: [...s.log, ...entries],
        });
      },
      handover: (round, mode) => {
        const s = get();
        const d = s.draws.find(x => x.round === round);
        const at = new Date().toISOString();
        const isLast = round >= s.members.length;
        const newLog = [...s.log, log({type: 'handover', round, memberId: d?.memberId})];
        if (isLast) newLog.push(log({type: 'complete'}));
        set({
          rounds: {...s.rounds, [round]: {...s.rounds[round], handedOverAt: at, handoverMode: mode}},
          log: newLog,
          completedAt: isLast ? at : s.completedAt,
        });
      },
      nextRound: () => {
        const s = get();
        if (s.currentRound < s.members.length) set({currentRound: s.currentRound + 1});
      },

      markCelebrated: () => set({celebrated: true}),

      addMember: m =>
        set(s => ({
          members: [...s.members, m],
          log: [...s.log, log({type: 'member', detail: `+ ${m.name}`})],
        })),
      updateMember: m => set(s => ({members: s.members.map(x => (x.id === m.id ? m : x))})),
      removeMember: id =>
        set(s => {
          const m = s.members.find(x => x.id === id);
          return {
            members: s.members.filter(x => x.id !== id),
            log: [...s.log, log({type: 'member', detail: `− ${m?.name ?? ''}`})],
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({
        committee: s.committee,
        members: s.members,
        draws: s.draws,
        khata: s.khata,
        rounds: s.rounds,
        currentRound: s.currentRound,
        log: s.log,
        completedAt: s.completedAt,
        celebrated: s.celebrated,
        settings: s.settings,
        view: s.view,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store>;
        return {...current, ...p, settings: {...defaultSettings, ...(p.settings ?? {})}};
      },
    },
  ),
);

/** Snapshot of just the committee data (for backups). */
export function selectData(s: Store): KametiData {
  return {
    committee: s.committee,
    members: s.members,
    draws: s.draws,
    khata: s.khata,
    rounds: s.rounds,
    currentRound: s.currentRound,
    log: s.log,
    completedAt: s.completedAt,
    celebrated: s.celebrated,
  };
}

export function isValidBackup(x: unknown): x is {format: string; data: KametiData} {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.format !== BACKUP_FORMAT) return false;
  const d = o.data as Record<string, unknown> | undefined;
  return !!d && Array.isArray(d.members) && Array.isArray(d.draws) && typeof d.khata === 'object';
}
