import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, switchMap, take } from 'rxjs/operators';
import { Match } from '../models/match.model';
import { Prediction } from '../models/prediction.model';
import { Polla } from '../models/polla.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly predictionsUrl = 'https://planeta-db.onrender.com/predictions';
  private readonly matchApiUrl = 'https://api.openligadb.de/getmatchdata';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getMatchesByPolla(polla: Polla): Observable<Match[]> {
    const url = `${this.matchApiUrl}/${polla.leagueShortcut}/${polla.leagueSeason}`;
    return this.http.get<Match[]>(url).pipe(
      catchError(error => this.handleError(error, 'Error obteniendo partidos'))
    );
  }

  getPredictionsByUser(userId: string, pollaId?: string): Observable<Prediction[]> {
    let url = `${this.predictionsUrl}?userId=${userId}`;
    if (pollaId) {
      url += `&pollaId=${pollaId}`;
    }

    return this.http.get<Prediction[]>(url).pipe(
      tap(predictions => console.log('📊 Predicciones encontradas:', predictions)),
      map(predictions => pollaId ? predictions.filter(p => p.pollaId === pollaId) : predictions),
      catchError(error => this.handleError(error, 'Error obteniendo predicciones'))
    );
  }

  savePrediction(prediction: Prediction): Observable<Prediction> {
    return this.http.post<Prediction>(this.predictionsUrl, prediction).pipe(
      tap(saved => console.log('✅ Predicción guardada:', saved)),
      catchError(error => this.handleError(error, 'Error guardando predicción'))
    );
  }

  updatePrediction(id: string, prediction: Prediction): Observable<Prediction> {
    const updateData = {
      pronosticoLocal: prediction.pronosticoLocal,
      pronosticoVisitante: prediction.pronosticoVisitante,
      pronosticoGuardado: prediction.pronosticoGuardado,
      puntos: prediction.puntos,
      resultadoFinal: prediction.resultadoFinal
    };

    return this.http.patch<Prediction>(`${this.predictionsUrl}/${id}`, updateData).pipe(
      tap(updated => console.log('✅ Predicción actualizada:', updated)),
      catchError(error => this.handleError(error, 'Error actualizando predicción'))
    );
  }

  saveOrUpdatePrediction(match: Match, userId: string, pollaId: string): Observable<Prediction> {
    return this.getPredictionsByUser(userId, pollaId).pipe(
      take(1),
      switchMap(predictions => {
        // Convert matchID to string for consistent comparison
        const existingPrediction = predictions.find(p =>
          p.matchId.toString() === match.matchID.toString() &&
          p.pollaId === pollaId
        );

        const prediction = this.createPredictionObject(
          match,
          userId,
          pollaId,
          existingPrediction?.id
        );

        if (existingPrediction) {
          console.log('🔄 Actualizando predicción existente:', existingPrediction.id);
          return this.updatePrediction(existingPrediction.id, prediction);
        } else {
          console.log('➕ Creando nueva predicción');
          return this.savePrediction(prediction);
        }
      })
    );
}

  private createPredictionObject(match: Match, userId: string, pollaId: string, existingId?: string): Prediction {
    return {
      id: existingId || Date.now().toString(),
      userId,
      pollaId,
      matchId: match.matchID.toString(),
      equipoLocal: match.team1.teamName,
      equipoVisitante: match.team2.teamName,
      horario: match.matchDateTimeUTC,
      pronosticoLocal: Number(match.pronosticoLocal),
      pronosticoVisitante: Number(match.pronosticoVisitante),
      pronosticoGuardado: `${match.pronosticoLocal} - ${match.pronosticoVisitante}`,
      resultadoFinal: this.obtenerResultadoFinal(match),
      puntos: this.calcularPuntosPartido(match)
    };
  }

  private handleError(error: HttpErrorResponse, customMessage: string): Observable<never> {
    console.error('❌ Error:', error);
    return throwError(() => new Error(customMessage || 'Algo salió mal; por favor, inténtalo de nuevo más tarde.'));
  }

  private obtenerResultadoFinal(match: Match): string {
    const resultado = match.matchResults.find(res => res.resultTypeID === 2);
    return resultado ? `${resultado.pointsTeam1} - ${resultado.pointsTeam2}` : '-';
  }

  deleteMatchPrediction(matchId: string, pollaId: string): Observable<void> {
    return this.authService.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user?.id) {
          return throwError(() => new Error('Usuario no autenticado'));
        }

        return this.getPredictionsByUser(user.id, pollaId).pipe(
          switchMap(predictions => {
            const prediction = predictions.find(p =>
              Number(p.matchId) === Number(matchId) &&
              Number(p.pollaId) === Number(pollaId)
            );

            if (!prediction) {
              console.warn('⚠️ No se encontró predicción para eliminar');
              return of(void 0);
            }

            return this.http.delete<void>(`${this.predictionsUrl}/${prediction.id}`).pipe(
              tap(() => console.log('✅ Predicción eliminada:', prediction)),
              catchError(error => {
                console.error('❌ Error eliminando predicción:', error);
                return throwError(() => new Error('Error eliminando predicción'));
              })
            );
          })
        );
      })
    );
  }

  private calcularPuntosPartido(match: Match): number {
    if (!match.matchResults?.length) return 0;
    if (match.pronosticoLocal === null || match.pronosticoVisitante === null) return 0;

    const resultado = match.matchResults.find(res => res.resultTypeID === 2);
    if (!resultado) return 0;

    const resultadoLocal = resultado.pointsTeam1;
    const resultadoVisitante = resultado.pointsTeam2;
    let puntos = 0;

    // Acertar goles de cualquier equipo = 2 puntos por cada uno
    if (match.pronosticoLocal === resultadoLocal) puntos += 2;
    if (match.pronosticoVisitante === resultadoVisitante) puntos += 2;

    // Acertar al ganador o empate = 5 puntos adicionales
    const acertoGanador =
        (match.pronosticoLocal > match.pronosticoVisitante && resultadoLocal > resultadoVisitante) ||
        (match.pronosticoLocal < match.pronosticoVisitante && resultadoLocal < resultadoVisitante) ||
        (match.pronosticoLocal === match.pronosticoVisitante && resultadoLocal === resultadoVisitante);

    if (acertoGanador) {
        puntos += 5;

        // Acertar diferencia de gol (solo si acertó ganador) = 1 punto adicional
        if ((match.pronosticoLocal - match.pronosticoVisitante) === (resultadoLocal - resultadoVisitante)) {
            puntos += 1;
        }
    }

    return puntos;
}
}
