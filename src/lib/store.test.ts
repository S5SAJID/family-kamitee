import {beforeEach, describe, expect, it} from 'vitest';
import {BACKUP_FORMAT, isValidBackup, selectData, useStore} from './store';
import {khataKey} from './calc';

const s = () => useStore.getState();
const lastLog = () => s().log[s().log.length - 1];

beforeEach(() => s().loadSample());

describe('draws', () => {
  it('never overwrites an existing round or winner', () => {
    const before = s().draws.length;
    s().recordDraws([
      {round: 1, memberId: 'mbr_02', at: '', method: 'single'}, // round taken
      {round: 6, memberId: 'mbr_03', at: '', method: 'single'}, // member already won
    ]);
    expect(s().draws).toHaveLength(before);
  });

  it('records a fresh draw, keeps rounds sorted and logs it', () => {
    s().recordDraws([{round: 5, memberId: 'mbr_02', at: '', method: 'single'}]);
    expect(s().draws.map(d => d.round)).toEqual([1, 2, 3, 4, 5]);
    expect(lastLog()).toMatchObject({type: 'draw', round: 5, memberId: 'mbr_02'});
  });

  it('logs a full-cycle draw once', () => {
    s().recordDraws(
      ['mbr_02', 'mbr_06', 'mbr_07', 'mbr_08', 'mbr_09', 'mbr_10'].map((memberId, i) => ({
        round: 5 + i,
        memberId,
        at: '',
        method: 'upfront' as const,
      })),
    );
    expect(s().draws).toHaveLength(10);
    expect(lastLog()).toMatchObject({type: 'drawAll', detail: '6'});
  });
});

describe('khata', () => {
  it('toggles an installment and logs both directions', () => {
    const key = khataKey(5, 'mbr_07'); // Imran: nothing paid in round 5
    s().togglePaid(5, 'mbr_07', 2);
    expect(s().khata[key].paid[2]).toMatchObject({mode: 'cash'});
    expect(lastLog()).toMatchObject({type: 'paid', round: 5, memberId: 'mbr_07', detail: '3'});
    s().togglePaid(5, 'mbr_07', 2);
    expect(s().khata[key].paid[2]).toBeNull();
    expect(lastLog().type).toBe('unpaid');
  });

  it('mark-all only logs when something changed', () => {
    s().setAllPaid(5, 'mbr_07', true);
    const n = s().log.length;
    s().setAllPaid(5, 'mbr_07', true);
    expect(s().log).toHaveLength(n);
  });
});

describe('rounds', () => {
  it('completes the cycle on the last handover', () => {
    s().handover(9, 'cash');
    expect(s().completedAt).toBeNull();
    s().handover(10, 'bank');
    expect(s().completedAt).not.toBeNull();
    expect(lastLog().type).toBe('complete');
  });

  it('does not advance past the last round', () => {
    useStore.setState({currentRound: 10});
    s().nextRound();
    expect(s().currentRound).toBe(10);
  });
});

describe('members', () => {
  it('logs edits only when something changed', () => {
    const m = s().members[0];
    const n = s().log.length;
    s().updateMember({...m});
    expect(s().log).toHaveLength(n);
    s().updateMember({...m, name: 'Tariq M.'});
    expect(s().members[0].name).toBe('Tariq M.');
    expect(lastLog()).toMatchObject({type: 'member', memberId: m.id});
  });
});

describe('backups', () => {
  it('round-trips through export / validate / import', () => {
    const backup = JSON.parse(JSON.stringify({format: BACKUP_FORMAT, version: 1, data: selectData(s())}));
    expect(isValidBackup(backup)).toBe(true);
    s().resetAll();
    expect(s().committee).toBeNull();
    s().importData(backup.data);
    expect(s().committee?.title).toBe('Khandani Kameti - 2026');
    expect(lastLog().type).toBe('import');
  });

  it('rejects foreign files', () => {
    expect(isValidBackup({format: 'other', data: {}})).toBe(false);
    expect(isValidBackup({format: BACKUP_FORMAT, data: {members: 'x'}})).toBe(false);
    expect(isValidBackup(null)).toBe(false);
  });
});
