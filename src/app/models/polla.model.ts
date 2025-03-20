export interface Polla {
  id?: number;
  leagueId: number;
  name: string;
  torneo: string;
  leagueShortcut: string;
  leagueSeason: string;
  adminId: string;
  participants: string[];
  matches: number[];
  notes: string;
}
