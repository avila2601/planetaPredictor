import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, switchMap, tap, catchError, take, finalize } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Polla } from '../models/polla.model';
import { User } from '../models/user.model';

interface TorneoData {
  name: string;
  leagueId: number;
  leagueShortcut: string;
  leagueSeason: string;
}

@Injectable({
  providedIn: 'root'
})
export class PollaService {
  private readonly apiUrl = 'http://localhost:3000/pollas';
  private readonly ligaApiUrl = 'https://api.openligadb.de/getavailableleagues';

  // Estado de la aplicación
  private pollas$ = new BehaviorSubject<Polla[]>([]);
  private pollaSeleccionada = new BehaviorSubject<Polla | null>(null);
  private loading = new BehaviorSubject<boolean>(false);

  // Observables públicos
  readonly getPollasByUser$ = this.pollas$.asObservable();
  readonly pollaSeleccionada$ = this.pollaSeleccionada.asObservable();
  readonly loading$ = this.loading.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Cargar pollas iniciales del usuario autenticado
    this.authService.user$.pipe(
      switchMap(user => user ? this.getPollasByLoggedUser() : of([]))
    ).subscribe(
      pollas => this.pollas$.next(pollas)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => new Error('Algo salió mal; por favor, inténtalo de nuevo más tarde.'));
  }

  cargarPollasPorUsuario(userId: number): void {
    this.loading.next(true);
    this.getPollasByLoggedUser().pipe(
      catchError(error => {
        this.handleError(error);
        return of([]);
      }),
      tap(() => this.loading.next(false))
    ).subscribe(
      pollas => this.pollas$.next(pollas)
    );
  }

  getPollasByLoggedUser(): Observable<Polla[]> {
    return this.authService.user$.pipe(
      switchMap((user: User | null) => {
        if (!user || !user.pollas || user.pollas.length === 0) return of([]);

        return this.http.get<Polla[]>(this.apiUrl).pipe(
          map(pollas => pollas.filter(polla =>
            user.pollas.includes(polla.id || 0)
          )),
          catchError(this.handleError)
        );
      })
    );
}

  getPollaById(id: string): Observable<Polla | null> {
    return this.http.get<Polla[]>(this.apiUrl).pipe(
      map(pollas => pollas.find(polla =>
        polla.id && polla.id.toString() === id
      ) || null),
      catchError(this.handleError)
    );
  }

  setPollaSeleccionada(polla: Polla | null): void {
    this.pollaSeleccionada.next(polla);
  }

  crearPolla(nombre: string, torneo: TorneoData, notas: string): Observable<Polla> {
    this.loading.next(true);

    return this.authService.user$.pipe(
      take(1), // Agregamos take(1) para evitar múltiples emisiones
      switchMap((user: User | null) => {
        if (!user) {
          this.loading.next(false);
          return throwError(() => new Error('Usuario no autenticado'));
        }

        const nuevaPolla: Polla = {
          id: Date.now(),
          leagueId: torneo.leagueId,
          name: nombre,
          torneo: torneo.name,
          leagueShortcut: torneo.leagueShortcut,
          leagueSeason: torneo.leagueSeason,
          adminId: Number(user.id),
          participants: [Number(user.id)],
          matches: [],
          notes: notas
        };

        // Primero creamos la polla
        return this.http.post<Polla>(this.apiUrl, nuevaPolla).pipe(
          take(1),
          switchMap(polla => {
            if (!polla.id) {
              this.loading.next(false);
              return throwError(() => new Error('La polla creada no tiene ID'));
            }

            // Luego actualizamos el usuario
            const updatedUser: User = {
              ...user,
              pollas: Array.from(new Set([...(user.pollas || []), polla.id]))
            };

            return this.http.patch<User>(`${this.authService.apiUrl}/${user.id}`, updatedUser).pipe(
              take(1),
              tap(() => {
                this.authService.setLoggedUser(updatedUser);
                this.cargarPollasPorUsuario(user.id);
              }),
              map(() => polla)
            );
          }),
          finalize(() => this.loading.next(false)),
          catchError(error => {
            console.error('Error al crear polla:', error);
            return throwError(() => new Error('Error al crear la polla'));
          })
        );
      })
    );
}

  getAllTorneos(): Observable<TorneoData[]> {
    return this.http.get<any[]>(this.ligaApiUrl).pipe(
      map(leagues => leagues
        .filter(league =>
          league.sport?.sportId === 1 &&
          ["2024", "2025"].includes(league.leagueSeason)
        )
        .map(league => ({
          name: league.leagueName,
          leagueId: league.leagueId,
          leagueShortcut: league.leagueShortcut,
          leagueSeason: league.leagueSeason
        }))
      ),
      catchError(this.handleError)
    );
  }

  calcularPosicionUsuario(polla: Polla): number {
    // Implementar lógica para calcular la posición
    return 1;
  }
}
