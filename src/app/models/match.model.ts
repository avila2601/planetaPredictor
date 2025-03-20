export interface Match {
  matchID: string;  // Se cambia de matchID a id para evitar problemas de búsqueda
  matchDateTime: Date; // Fecha en formato local
  matchDateTimeUTC: string; // Fecha en formato UTC
  timeZoneID: string;
  leagueId: string;
  leagueName: string;
  leagueSeason: number;
  team1: Team;
  team2: Team;
  lastUpdateDateTime: Date;
  matchIsFinished: boolean;
  matchResults: MatchResult[];
  pronosticoLocal: number | null; // Pronóstico del equipo local
  pronosticoVisitante: number | null; // Pronóstico del equipo visitante
  pronosticoGuardado?: string; // Almacena el pronóstico guardado
  puntos?: number; // Almacena los puntos del pronóstico
}

export interface Team {
  teamId: number;
  teamName: string;
  teamIconUrl: string;
}

export interface MatchResult {
  resultID: number;
  pointsTeam1: number;
  pointsTeam2: number;
  resultTypeID: number;
}
