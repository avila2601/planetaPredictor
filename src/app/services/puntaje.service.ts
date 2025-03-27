import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { Polla } from '../models/polla.model';
import { Puntaje } from '../models/puntaje.model';

@Injectable({
  providedIn: 'root'
})
export class PuntajeService {
  private readonly API_URL = 'http://localhost:3000/puntajes';
  private puntajesPorPollaSubject = new BehaviorSubject<Map<string, number>>(new Map());
  private puntajeTotalSubject = new BehaviorSubject<number>(0);

  readonly puntajesPorPolla$ = this.puntajesPorPollaSubject.asObservable();
  readonly puntajeTotal$ = this.puntajeTotalSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('🔄 Inicializando PuntajeService');
  }

  cargarPuntajes(userId: string): void {
    console.log('🔄 Cargando puntajes para usuario:', userId);
    this.obtenerPuntajesPorUsuario(userId).subscribe({
      next: puntajes => {
        const puntajesMap = new Map<string, number>();
        let puntajeTotal = 0;

        puntajes.forEach(p => {
          if (p.pollaId) {
            puntajesMap.set(p.pollaId.toString(), Number(p.puntajeTotal));
            puntajeTotal += Number(p.puntajeTotal);
          }
        });

        this.puntajesPorPollaSubject.next(puntajesMap);
        this.puntajeTotalSubject.next(puntajeTotal);
        console.log('📊 Puntajes cargados:', { puntajes, total: puntajeTotal });
      },
      error: error => console.error('❌ Error cargando puntajes:', error)
    });
  }

  actualizarPuntaje(pollaId: string, userId: string, nuevoPuntaje: number): Observable<Puntaje> {
    console.log('🔄 Actualizando puntaje:', { pollaId, userId, nuevoPuntaje });

    return this.obtenerPuntajeExistente(pollaId, userId).pipe(
      switchMap(puntajeExistente => {
        if (puntajeExistente) {
          console.log('📝 Actualizando puntaje existente');
          return this.http.patch<Puntaje>(
            `${this.API_URL}/${puntajeExistente.id}`,
            { puntajeTotal: nuevoPuntaje }
          );
        } else {
          console.log('➕ Creando nuevo puntaje');
          const nuevoPuntajeObj: Puntaje = {
            id: `${pollaId}_${userId}_${Date.now()}`,
            userId,
            pollaId,
            puntajeTotal: nuevoPuntaje
          };
          return this.http.post<Puntaje>(this.API_URL, nuevoPuntajeObj);
        }
      }),
      tap(puntaje => {
        const puntajesActuales = this.puntajesPorPollaSubject.getValue();
        puntajesActuales.set(puntaje.pollaId, puntaje.puntajeTotal);
        this.puntajesPorPollaSubject.next(puntajesActuales);
        this.actualizarPuntajeTotal();
        console.log('✅ Puntaje actualizado:', puntaje);
      }),
      catchError(error => {
        console.error('❌ Error actualizando puntaje:', error);
        throw error;
      })
    );
  }

  inicializarPuntajeParaNuevoMiembro(pollaId: string, userId: string): Observable<Puntaje> {
    console.log('🔄 Inicializando puntaje para nuevo miembro:', { pollaId, userId });

    const puntaje: Puntaje = {
      id: `${pollaId}_${userId}_${Date.now()}`,
      userId,
      pollaId,
      puntajeTotal: 0
    };

    return this.http.post<Puntaje>(this.API_URL, puntaje).pipe(
      tap(nuevoPuntaje => console.log('✅ Puntaje inicializado:', nuevoPuntaje)),
      catchError(error => {
        console.error('❌ Error inicializando puntaje:', error);
        throw error;
      })
    );
  }

  obtenerPuntajesPorPolla(pollaId: string): Observable<Puntaje[]> {
    console.log('🔍 Obteniendo puntajes de polla:', pollaId);

    return this.http.get<Puntaje[]>(`${this.API_URL}?pollaId=${pollaId}`).pipe(
      tap(puntajes => console.log('📊 Puntajes encontrados:', puntajes)),
      catchError(error => {
        console.error('❌ Error obteniendo puntajes:', error);
        return of([]);
      })
    );
  }

  private obtenerPuntajesPorUsuario(userId: string): Observable<Puntaje[]> {
    return this.http.get<Puntaje[]>(`${this.API_URL}?userId=${userId}`).pipe(
      tap(puntajes => console.log('📊 Puntajes de usuario encontrados:', puntajes)),
      catchError(error => {
        console.error('❌ Error obteniendo puntajes del usuario:', error);
        return of([]);
      })
    );
  }

  private obtenerPuntajeExistente(pollaId: string, userId: string): Observable<Puntaje | null> {
    return this.http.get<Puntaje[]>(`${this.API_URL}?pollaId=${pollaId}&userId=${userId}`).pipe(
      map(puntajes => puntajes[0] || null),
      tap(puntaje => console.log('🔍 Puntaje existente:', puntaje)),
      catchError(error => {
        console.error('❌ Error buscando puntaje existente:', error);
        return of(null);
      })
    );
  }

  private actualizarPuntajeTotal(): void {
    const puntajes = this.puntajesPorPollaSubject.getValue();
    const total = Array.from(puntajes.values())
      .reduce((sum, p) => sum + Number(p), 0);
    this.puntajeTotalSubject.next(total);
    console.log('💯 Puntaje total actualizado:', total);
  }
}
