export interface Prediction {
  id: string;               // ID único del pronóstico
  userId: string;           // ID del usuario que hizo el pronóstico
  matchId: string;          // ID del partido al que pertenece el pronóstico
  pollaId?: string;         // (Opcional) ID de la polla si lo manejas por grupos
  equipoLocal: string;      // Nombre del equipo local
  equipoVisitante: string;  // Nombre del equipo visitante
  horario: string;          // Fecha y hora del partido en formato UTC
  pronosticoLocal: number;  // Goles pronosticados para el equipo local
  pronosticoVisitante: number; // Goles pronosticados para el equipo visitante
  pronosticoGuardado: string;  // Pronóstico en formato "X - Y"
  resultadoFinal?: string;  // Resultado final del partido en formato "X - Y"
  puntos: number;           // Puntos obtenidos según el pronóstico
}
