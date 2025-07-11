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
  private readonly apiUrl = 'https://planeta-db.onrender.com/pollas';
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
  console.log('🔍 Iniciando cálculo de posición para polla:', polla.id);

  if (!polla.participants?.length) {
      console.log('⚠️ No hay participantes en la polla');
      return of(1);
  }

  console.log('👥 Participantes:', polla.participants);

  // Get puntajes for this polla first
  return this.puntajeService.obtenerPuntajesPorPolla(polla.id!).pipe(
      switchMap(puntajes => {
          console.log('💯 Puntajes de la polla:', puntajes);

          return forkJoin(
              polla.participants.map(participantId => {
                  console.log('🔄 Obteniendo datos del participante:', participantId);
                  return this.authService.getUserById(participantId);
              })
          ).pipe(
              map(participants => {
                  console.log('📊 Datos de participantes obtenidos:', participants);

                  const participantesConPuntajes = participants
                      .filter((p): p is User => {
                          const isValid = p !== null;
                          if (!isValid) console.log('⚠️ Usuario no encontrado en los datos');
                          return isValid;
                      })
                      .map(participant => {
                          // Find puntaje for this participant in this polla
                          const puntajeObj = puntajes.find(p =>
                              p.userId === participant.id &&
                              p.pollaId === polla.id
                          );
                          const puntaje = puntajeObj?.puntajeTotal || 0;
                          console.log(`📝 Puntaje de ${participant.id}:`, puntaje);

                          return {
                              id: participant.id,
                              puntaje: Number(puntaje)
                          };
                      });

                  console.log('📊 Participantes con puntajes:', participantesConPuntajes);

                  // Sort by points (highest first)
                  participantesConPuntajes.sort((a, b) => b.puntaje - a.puntaje);
                  console.log('🏆 Ranking ordenado:', participantesConPuntajes);

                  const currentUserId = this.authService.getCurrentUserId();
                  console.log('👤 Usuario actual:', currentUserId);

                  const position = participantesConPuntajes.findIndex(p => p.id === currentUserId) + 1;
                  const finalPosition = position || participantesConPuntajes.length + 1;

                  console.log('🎯 Posición final calculada:', {
                      pollaId: polla.id,
                      userId: currentUserId,
                      position: finalPosition,
                      totalParticipants: participantesConPuntajes.length,
                      ranking: participantesConPuntajes
                  });

                  return finalPosition;
              })
          );
      }),
      catchError(error => {
          console.error('❌ Error en el cálculo:', error);
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

      const inviteCode = Math.random().toString(36).substring(2, 15);

      const nuevaPolla: Polla = {
        id: Date.now().toString(),
        name: nombre,
        torneo: torneo.name!,
        leagueId: torneo.leagueId!,
        leagueShortcut: torneo.leagueShortcut!,
        leagueSeason: torneo.leagueSeason!,
        adminId: user.id,
        participants: [user.id],
        notes: notas,
        inviteCode
      };

      return this.http.post<Polla>(this.apiUrl, nuevaPolla).pipe(
        switchMap(polla => {
          const updatedUser = {
            ...user,
            pollas: [...(user.pollas || []), polla.id!]
          };

          // Use inicializarPuntajeParaNuevoMiembro instead of inicializarPuntajesParaPolla
          return forkJoin({
            polla: this.http.patch<Polla>(`${this.apiUrl}/${polla.id}`, polla),
            user: this.authService.updateUser(updatedUser),
            puntaje: this.puntajeService.inicializarPuntajeParaNuevoMiembro(polla.id!, user.id)
          }).pipe(
            map(() => polla),
            tap(() => {
              const currentPollas = this.pollas$.getValue();
              this.pollas$.next([...currentPollas, polla]);
              console.log('✅ Polla creada con link de invitación:', this.getInviteLink(polla));
            })
          );
        }),
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


  generateInviteCode(polla: Polla): Observable<Polla> {
    const inviteCode = Math.random().toString(36).substring(2, 15);
    const updatedPolla = { ...polla, inviteCode };

    return this.http.patch<Polla>(`${this.apiUrl}/${polla.id}`, updatedPolla).pipe(
      tap(updated => console.log('✅ Código de invitación generado:', updated.inviteCode)),
      catchError(this.handleError)
    );
  }

  addParticipant(pollaId: string, userId: string): Observable<Polla> {
    console.log('🔄 Añadiendo participante a polla:', { pollaId, userId });

    return forkJoin({
      polla: this.getPollaById(pollaId),
      user: this.authService.getUserById(userId)
    }).pipe(
      switchMap(({ polla, user }) => {
        if (!polla || !user) {
          return throwError(() => new Error('Polla o usuario no encontrado'));
        }

        // Update polla participants
        const updatedPolla = {
          ...polla,
          participants: [...polla.participants, userId]
        };

        // Update user's pollas
        const updatedUser = {
          ...user,
          pollas: [...(user.pollas || []), pollaId]
        };

        // Execute updates
        return forkJoin({
          polla: this.http.patch<Polla>(`${this.apiUrl}/${pollaId}`, updatedPolla),
          user: this.authService.updateUser(updatedUser),
          puntaje: this.puntajeService.inicializarPuntajeParaNuevoMiembro(pollaId, userId)
        }).pipe(
          map(() => updatedPolla),
          tap(() => {
            const currentPollas = this.pollas$.getValue();
            const pollaIndex = currentPollas.findIndex(p => p.id === pollaId);

            if (pollaIndex !== -1) {
              // Update existing polla
              const updatedPollas = [...currentPollas];
              updatedPollas[pollaIndex] = updatedPolla;
              this.pollas$.next(updatedPollas);
            } else {
              // Add new polla
              this.pollas$.next([...currentPollas, updatedPolla]);
            }
            console.log('✅ Participante añadido exitosamente');
          }),
          catchError(error => {
            console.error('❌ Error añadiendo participante:', error);
            return this.handleError(error);
          })
        );
      })
    );
  }

  getInviteLink(polla: Polla): string {
    if (!polla.inviteCode) {
      console.warn('⚠️ Polla sin código de invitación');
      return '';
    }
    // Incluir el baseHref para GitHub Pages
    const baseHref = '/planetaPredictor/';
    return `${window.location.origin}${baseHref}join-polla/${polla.id}/${polla.inviteCode}`;
  }
}


