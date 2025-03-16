import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Polla } from '../models/polla.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PollaService {
  private apiUrl = 'http://localhost:3000/pollas';
  private pollas$ = new BehaviorSubject<Polla[]>([]);  // Cambié el nombre a 'pollas$' para reflejar que es un array

  private pollaSeleccionada = new BehaviorSubject<Polla | null>(null);
  pollaSeleccionada$ = this.pollaSeleccionada.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  // 🔥 Obtener todas las pollas en las que el usuario participa
  getPollasByLoggedUser(): Observable<Polla[]> {
    return this.authService.user$.pipe(
      switchMap((user: User | null) => {
        console.log('Usuario autenticado:', user);
        if (!user) return of([]);

        return this.http.get<Polla[]>(this.apiUrl).pipe(
          tap(pollas => console.log('Pollas en DB:', pollas)),
          map(pollas => pollas.filter(polla => polla.participants.includes(Number(user.id)))),
          tap(filtradas => console.log('Pollas del usuario:', filtradas))
        );
      })
    );
  }

  // 🔥 Obtener una polla específica por ID
  getPollaById(id: string): Observable<Polla | null> {
    return this.http.get<Polla[]>(this.apiUrl).pipe(
      map(pollas => pollas.find(polla => polla.id && polla.id.toString() === id) || null)
    );
  }

  // 🔥 Guardar la polla seleccionada en memoria
  setPollaSeleccionada(polla: Polla | null) {
    this.pollaSeleccionada.next(polla);
  }

  // 🔥 Obtener la polla seleccionada
  getPollaSeleccionadaValor(): Polla | null {
    return this.pollaSeleccionada.getValue(); // Solo funciona porque es un BehaviorSubject
  }

  // Método para obtener todas las pollas
  obtenerPollas(): Observable<Polla[]> {
    return this.http.get<Polla[]>(this.apiUrl).pipe(
      tap((pollas) => {
        this.pollas$.next(pollas); // Actualiza la lista de pollas en el BehaviorSubject
      })
    );
  }

  // Método para obtener la lista de pollas como un Observable
  getPollas(): Observable<Polla[]> {
    return this.pollas$.asObservable(); // Nos suscribimos al Observable para obtener las pollas actualizadas
  }

  // 🔥 Crear una nueva polla
  crearPolla(nombre: string, torneo: { name: string; leagueId: number; leagueShortcut: string; leagueSeason: string }, notas: string): Observable<Polla> {
    return this.authService.user$.pipe(
      switchMap((user: User | null) => {
        if (!user) throw new Error('Usuario no autenticado');

        const userId = Number(user.id);

        const nuevaPolla: Polla = {
          leagueId: torneo.leagueId,
          name: nombre,
          torneo: torneo.name,
          leagueShortcut: torneo.leagueShortcut,
          leagueSeason: torneo.leagueSeason,
          adminId: userId,
          participants: [userId],
          matches: [],
          notes: notas
        };

        return this.http.post<Polla>(this.apiUrl, nuevaPolla).pipe(
          tap(() => {
            // Actualiza la lista de pollas después de crear la nueva polla
            this.obtenerPollas().subscribe(); // Se actualiza la lista de pollas
            location.reload();
          })
        );
      })
    );
  }

  // 🔥 Obtener todas las ligas disponibles
  getAllTorneos(): Observable<{ name: string; leagueId: number; leagueShortcut: string; leagueSeason: string }[]> {
    return this.http.get<any[]>('https://api.openligadb.de/getavailableleagues').pipe(
      map(leagues =>
        leagues
          .filter(league => league.sport?.sportId === 1 && (league.leagueSeason === "2024" || league.leagueSeason === "2025"))
          .map(league => ({
            name: league.leagueName,
            leagueId: league.leagueId,
            leagueShortcut: league.leagueShortcut,
            leagueSeason: league.leagueSeason
          }))
      )
    );
  }

  // 🔥 Obtener datos de una liga específica usando su `leagueId`
  obtenerDatosLiga(leagueId: number): Observable<{ leagueShortcut: string; leagueSeason: string }> {
    return this.http.get<any[]>('https://api.openligadb.de/getavailableleagues').pipe(
      map(leagues => {
        const liga = leagues.find(league => league.leagueId === leagueId);
        if (!liga) throw new Error('Liga no encontrada');

        return {
          leagueShortcut: liga.leagueShortcut,
          leagueSeason: liga.leagueSeason.toString()
        };
      })
    );
  }
}
