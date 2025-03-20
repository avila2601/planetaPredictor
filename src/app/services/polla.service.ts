import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, tap, catchError, take, finalize } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Polla } from '../models/polla.model';
import { User } from '../models/user.model';
import { PuntajeService } from './puntaje.service';



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
    private authService: AuthService,
    private puntajeService: PuntajeService
  ) {
    this.inicializarPollas();
  }

  private inicializarPollas(): void {
    this.authService.user$.pipe(
      switchMap(user => user ? this.getPollasByLoggedUser() : of([]))
    ).subscribe(pollas => this.pollas$.next(pollas));
  }

  getPollaById(id: string): Observable<Polla | null> {
    return this.http.get<Polla[]>(this.apiUrl).pipe(
      map(pollas => pollas.find(p => p.id?.toString() === id) || null),
      tap(polla => console.log(polla ? '✅ Polla encontrada:' : '⚠️ Polla no encontrada:', polla)),
      catchError(this.handleError)
    );
  }

  getPollasByLoggedUser(): Observable<Polla[]> {
    return this.authService.user$.pipe(
        switchMap((user: User | null) => {
            if (!user?.pollas?.length) return of([]);

            return this.http.get<Polla[]>(this.apiUrl).pipe(
                map(pollas => pollas.filter(p => {
                    // Ensure both IDs are strings for comparison
                    const pollaId = p.id?.toString() || '';
                    return user.pollas.includes(pollaId);
                })),
                tap(pollas => console.log('📋 Pollas del usuario:', pollas)),
                catchError(this.handleError)
            );
        })
    );
}

  calcularPosicionUsuario(polla: Polla): Observable<number> {
    if (!polla.participants?.length) {
        return of(1);
    }

    return forkJoin(
        polla.participants.map(participantId =>
            this.authService.getUserById(participantId)
        )
    ).pipe(
        map(participants => {
            const participantesConPuntajes = participants
                .filter((p): p is User => p !== null)
                .map(participant => ({
                    id: participant.id,
                    puntaje: participant.puntaje || 0
                }));

            participantesConPuntajes.sort((a, b) => b.puntaje - a.puntaje);

            const currentUserId = this.authService.getCurrentUserId();
            const position = participantesConPuntajes.findIndex(p => p.id === currentUserId) + 1;

            console.log('🏆 Posición calculada:', {
                pollaId: polla.id,
                userId: currentUserId,
                position: position || participantesConPuntajes.length + 1
            });

            return position || participantesConPuntajes.length + 1;
        }),
        catchError(error => {
            console.error('❌ Error calculando posición:', error);
            return of(0);
        })
    );
}

  cargarPollasPorUsuario(userId: string): void {
    this.loading.next(true);

    this.getPollasByLoggedUser().pipe(
        catchError(error => {
            console.error('❌ Error cargando pollas:', error);
            return of([]);
        }),
        finalize(() => this.loading.next(false))
    ).subscribe(pollas => {
        console.log('📋 Pollas cargadas para usuario:', { userId, count: pollas.length });
        this.pollas$.next(pollas);
    });
}

crearPolla(nombre: string, torneo: Partial<Polla>, notas: string): Observable<Polla> {
  this.loading.next(true);

  return this.authService.user$.pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const nuevaPolla: Polla = {
        id: Date.now().toString(),
        name: nombre,
        torneo: torneo.name!,
        leagueId: torneo.leagueId!,
        leagueShortcut: torneo.leagueShortcut!,
        leagueSeason: torneo.leagueSeason!,
        adminId: user.id,
        participants: [user.id],
        notes: notas
      };

      // 1. Create the polla
      return this.http.post<Polla>(this.apiUrl, nuevaPolla).pipe(
        switchMap(polla => {
          // 2. Update user's pollas array
          const updatedUser = {
            ...user,
            pollas: [...(user.pollas || []), polla.id!]
          };

          // 3. Create initial puntaje for the creator
          const initialPuntaje = {
            id: `${polla.id}_${user.id}_${Date.now()}`,
            userId: user.id,
            pollaId: polla.id!,
            puntajeTotal: 0
          };

          // 4. Execute all updates in parallel
          return forkJoin({
            polla: this.http.patch<Polla>(`${this.apiUrl}/${polla.id}`, polla),
            user: this.authService.updateUser(updatedUser),
            puntaje: this.puntajeService.inicializarPuntajesParaPolla(polla)
          }).pipe(
            map(() => polla),
            tap(() => {
              // Update local BehaviorSubject
              const currentPollas = this.pollas$.getValue();
              this.pollas$.next([...currentPollas, polla]);
            })
          );
        }),
        tap(polla => console.log('✅ Polla creada:', polla)),
        catchError(error => {
          console.error('❌ Error creando polla:', error);
          return this.handleError(error);
        }),
        finalize(() => this.loading.next(false))
      );
    })
  );
}


  setPollaSeleccionada(polla: Polla | null): void {
    this.pollaSeleccionada.next(polla);
    console.log('🎯 Polla seleccionada:', polla);
  }

  getAllTorneos(): Observable<Partial<Polla>[]> {
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
      tap(torneos => console.log('🏆 Torneos disponibles:', torneos)),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('❌ Error:', error);
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido';
    return throwError(() => new Error(`Error en PollaService: ${message}`));
  }

  actualizarPolla(polla: Polla): Observable<Polla> {
    if (!polla.id) {
      return throwError(() => new Error('ID de polla no proporcionado'));
    }

    return this.http.patch<Polla>(`${this.apiUrl}/${polla.id}`, polla).pipe(
      tap(updated => console.log('✅ Polla actualizada:', updated)),
      catchError(this.handleError)
    );
  }
}
