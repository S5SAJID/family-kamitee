export type Lang = 'en' | 'ru'; // English | Roman Urdu
export type CollectionInterval = 'daily' | 'weekly' | 'monthly';
export type PayoutInterval = 'weekly' | 'monthly';
export type DrawMode = 'upfront' | 'round';
export type PayMode = 'cash' | 'easypaisa' | 'jazzcash' | 'bank';

export interface Committee {
  id: string;
  title: string;
  /** Amount each member pays per collection installment (PKR). */
  contribution: number;
  collectionInterval: CollectionInterval;
  payoutInterval: PayoutInterval;
  /** How many collection installments make up one payout round. */
  installmentsPerRound: number;
  /** ISO date YYYY-MM-DD of round 1. */
  startDate: string;
  drawMode: DrawMode;
  organizer: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
}

export interface PaidMark {
  at: string; // ISO timestamp
  mode: PayMode;
}

export interface KhataEntry {
  /** One slot per installment of the round; null = baqi (pending). */
  paid: (PaidMark | null)[];
  /** Preferred payment mode for this member in this round. */
  mode: PayMode;
  note: string;
}

export interface Draw {
  round: number;
  memberId: string;
  at: string;
  method: 'single' | 'upfront';
}

export interface RoundMeta {
  handedOverAt?: string;
  handoverMode?: PayMode;
  note?: string;
}

export type LogType =
  | 'setup'
  | 'draw'
  | 'drawAll'
  | 'paid'
  | 'unpaid'
  | 'handover'
  | 'complete'
  | 'import'
  | 'member';

export interface LogEntry {
  id: string;
  at: string;
  type: LogType;
  round?: number;
  memberId?: string;
  detail?: string;
}

export interface Settings {
  lang: Lang;
  sound: boolean;
  largeText: boolean;
  currency: 'Rs.' | '₨';
  pinHash: string | null;
  sidebarCollapsed: boolean;
}

export interface KametiData {
  committee: Committee | null;
  members: Member[];
  draws: Draw[];
  khata: Record<string, KhataEntry>;
  rounds: Record<number, RoundMeta>;
  currentRound: number;
  log: LogEntry[];
  completedAt: string | null;
  /** Completion ceremony already shown. */
  celebrated: boolean;
}

export type ViewId = 'dashboard' | 'khata' | 'draw' | 'history' | 'settings';
