import type {Committee, KametiData, KhataEntry, LogEntry, Member, PayMode} from './types';
import {installmentDue, khataKey, roundEnd} from './calc';

const NAMES: [string, string][] = [
  ['Tariq Mahmood', '0300-1234567'],
  ['Usman Ali', '0321-4567890'],
  ['Fatima Bibi', '0333-7654321'],
  ['Zainab Noor', '0345-2223344'],
  ['Bilal Ahmed', '0312-9988776'],
  ['Ayesha Siddiqui', '0301-5566778'],
  ['Imran Qureshi', '0322-1112233'],
  ['Nadia Parveen', '0336-4455667'],
  ['Hamza Riaz', '0346-7788990'],
  ['Saima Khalid', '0315-3344556'],
];

const MODES: PayMode[] = ['cash', 'easypaisa', 'jazzcash', 'bank', 'cash', 'jazzcash', 'cash', 'easypaisa', 'bank', 'cash'];

/** "Khandani Kameti - 2026": Rs. 2,500 weekly, Rs. 1,00,000 monthly pot. */
export function buildSampleData(): KametiData {
  const committee: Committee = {
    id: 'cmt_sample_2026',
    title: 'Khandani Kameti - 2026',
    contribution: 2500,
    collectionInterval: 'weekly',
    payoutInterval: 'monthly',
    installmentsPerRound: 4,
    startDate: '2026-06-01',
    drawMode: 'round',
    organizer: 'Tariq Mahmood',
    createdAt: '2026-05-25T18:30:00.000Z',
  };

  const members: Member[] = NAMES.map(([name, phone], i) => ({
    id: `mbr_${String(i + 1).padStart(2, '0')}`,
    name,
    phone,
  }));

  const log: LogEntry[] = [
    {id: 'log_0', at: committee.createdAt, type: 'setup', detail: committee.title},
  ];

  // Rounds 1-4 drawn and completed. Round 5 (October) is in progress.
  const winners = ['mbr_03', 'mbr_05', 'mbr_01', 'mbr_04']; // Fatima, Bilal, Tariq, Zainab
  const draws = winners.map((memberId, i) => {
    const at = new Date(installmentDue(committee, i + 1, 3));
    at.setHours(20, 15);
    return {round: i + 1, memberId, at: at.toISOString(), method: 'single' as const};
  });

  const khata: Record<string, KhataEntry> = {};
  const rounds: KametiData['rounds'] = {};

  for (let r = 1; r <= 4; r++) {
    members.forEach((m, mi) => {
      const mode = MODES[mi];
      khata[khataKey(r, m.id)] = {
        mode,
        note: '',
        paid: [0, 1, 2, 3].map(k => {
          const d = installmentDue(committee, r, k);
          d.setDate(d.getDate() + ((mi + k) % 3));
          d.setHours(11 + (mi % 6), 10 + mi);
          return {at: d.toISOString(), mode};
        }),
      };
    });
    const d = draws[r - 1];
    log.push({id: `log_d${r}`, at: d.at, type: 'draw', round: r, memberId: d.memberId});
    const ho = roundEnd(committee, r);
    ho.setHours(19, 0);
    rounds[r] = {handedOverAt: ho.toISOString(), handoverMode: r % 2 ? 'cash' : 'bank'};
    log.push({id: `log_h${r}`, at: ho.toISOString(), type: 'handover', round: r, memberId: d.memberId});
  }

  // Round 5: first two weekly installments (1 & 8 Oct) mostly paid.
  const r5Paid: number[][] = [
    [0, 1], [0, 1], [0, 1], [0], [0, 1], [0, 1], [], [0, 1], [0], [0, 1],
  ];
  members.forEach((m, mi) => {
    const mode = MODES[mi];
    khata[khataKey(5, m.id)] = {
      mode,
      note:
        mi === 6
          ? 'Will pay both installments on salary day (15 Oct)'
          : mi === 3
            ? 'Rs. 1,000 of 2nd installment given in cash, rest Friday'
            : '',
      paid: [0, 1, 2, 3].map(k => {
        if (!r5Paid[mi].includes(k)) return null;
        const d = installmentDue(committee, 5, k);
        d.setHours(10 + (mi % 7), 5 + mi * 3);
        return {at: d.toISOString(), mode};
      }),
    };
  });

  return {
    committee,
    members,
    draws,
    khata,
    rounds,
    currentRound: 5,
    log: log.sort((a, b) => a.at.localeCompare(b.at)),
    completedAt: null,
    celebrated: false,
  };
}
