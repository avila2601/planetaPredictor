import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match } from '../models/match.model';
import { Prediction } from '../models/prediction.model';
import { Polla } from '../models/polla.model'; // Asegúrate de importar el modelo correcto

@Injectable({
  providedIn: 'root',
})
export class MatchService {
  private predictionsUrl = 'http://localhost:3000/predictions'; // Ruta para guardar pronósticos

  constructor(private http: HttpClient) {}

  // ✅ Nuevo método para obtener los partidos según la polla
  getMatchesByPolla(polla: Polla): Observable<Match[]> {
    const url = `https://api.openligadb.de/getmatchdata/${polla.leagueShortcut}/${polla.leagueSeason}`;
    return this.http.get<Match[]>(url);
  }

  getPredictionsByUser(userId: number): Observable<Prediction[]> {
    return this.http.get<Prediction[]>(`${this.predictionsUrl}?userId=${userId}`);
  }

  savePrediction(prediction: Prediction): Observable<Prediction> {
    return this.http.post<Prediction>(this.predictionsUrl, prediction);
  }

  updatePrediction(id: number, prediction: Prediction): Observable<Prediction> {
    return this.http.put<Prediction>(`${this.predictionsUrl}/${id}`, prediction);
  }
}
