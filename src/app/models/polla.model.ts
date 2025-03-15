export interface Polla {
  id?: number;
  leagueId: number;
  name: string;
  torneo: string;
  leagueShortcut: string;
  leagueSeason: string;
  adminId: number;
  participants: number[];
  matches: number[];
  notes: string;
}
