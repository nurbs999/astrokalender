export type Rating = 'up' | 'down' | 'none';

export interface Photo {
  id: string;
  title: string;
  author: string;
  image_url: string;
  telescope?: string;
  exposure?: string;
  description?: string;
  created_at?: string;
}

export interface Voter {
  id?: string;
  email: string;
  name: string;
  is_verified?: boolean;
  verification_code?: string;
  verified_at?: string;
  created_at?: string;
}

export interface Vote {
  id?: string;
  photo_id: string;
  voter_email: string;
  rating: Rating;
  suggested_month: number | null; // 0 = Deckblatt, 1 to 12 = Jan-Dez, or null
  updated_at?: string;
}

export interface DetailedVote extends Vote {
  voter_name?: string;
  is_verified?: boolean;
}

export interface PhotoVoteSummary {
  photo_id: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  totalVotes: number;
  monthCounts: Record<number, number>; // 0-12 -> count
  topMonth: {
    month: number;
    percentage: number;
    count: number;
  } | null;
}

export interface VoterStats {
  email: string;
  name: string;
  is_verified: boolean;
  votesCount: number;
  lastActive: string;
}

export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
];

export function getMonthLabel(monthNum: number): string {
  if (monthNum === 0) return 'Deckblatt';
  return MONTH_NAMES[monthNum - 1] || `Monat ${monthNum}`;
}

export function getMonthShortLabel(monthNum: number): string {
  if (monthNum === 0) return 'Deckbl.';
  return MONTH_SHORT_NAMES[monthNum - 1] || `${monthNum}`;
}
