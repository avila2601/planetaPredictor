import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, forkJoin, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { Polla } from '../models/polla.model';
import { Puntaje } from '../models/puntaje.model';

@Injectable({
  providedIn: 'root'
})
export class PuntajeService {
  private readonly API_URL = 'http://localhost:3000/puntajes';

  // BehaviorSubjects for state management
  private puntajesPorPollaSubject = new BehaviorSubject<Map<string, number>>(new Map());
  private puntajeTotalSubject = new BehaviorSubject<number>(0);

  // Public Observables
  readonly puntajesPorPolla$ = this.puntajesPorPollaSubject.asObservable();
  readonly puntajeTotal$ = this.puntajeTotalSubject.asObservable();

  constructor(private http: HttpClient) {}

  cargarPuntajes(userId: string): void {
    this.obtenerPuntajesPorUsuario(userId).subscribe(puntajes => {
      const puntajesMap = new Map<string, number>();
      let puntajeTotal = 0;

      puntajes.forEach(p => {
        if (p.pollaId) {
          // Ensure pollaId is converted to string if needed
          puntajesMap.set(p.pollaId.toString(), Number(p.puntajeTotal));
          puntajeTotal += p.puntajeTotal;
        }
      });

      this.puntajesPorPollaSubject.next(puntajesMap);
      this.puntajeTotalSubject.next(puntajeTotal);
      console.log('📊 Puntajes cargados:', { puntajes, total: puntajeTotal });
    });
}

actualizarPuntaje(pollaId: string, userId: string, nuevoPuntaje: number): Observable<Puntaje> {
  return this.obtenerPuntajeExistente(pollaId, userId).pipe(
    switchMap(puntajeExistente => {
      if (puntajeExistente) {
        const puntajeActualizado: Partial<Puntaje> = {
          puntajeTotal: nuevoPuntaje
        };
        return this.http.patch<Puntaje>(
          `${this.API_URL}/${puntajeExistente.id}`,
          puntajeActualizado
        );
      } else {
        const nuevoPuntajeObj: Puntaje = {
          id: `${pollaId}_${userId}_${Date.now()}`,
          userId: userId,
          pollaId: pollaId,
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
    })
  );
}


  inicializarPuntajesParaPolla(polla: Polla): Observable<Puntaje[]> {
    if (!polla.participants?.length) {
      return of([]);
    }

    const createPuntajes = polla.participants.map(userId => {
      const puntaje: Puntaje = {
        id: `${polla.id}_${userId}_${Date.now()}`,
        userId,
        pollaId: polla.id!,
        puntajeTotal: 0
      };
      return this.http.post<Puntaje>(this.API_URL, puntaje);
    });

    return forkJoin(createPuntajes).pipe(
      tap(puntajes => console.log('✅ Puntajes inicializados:', puntajes)),
      catchError(error => {
        console.error('❌ Error inicializando puntajes:', error);
        return of([]);
      })
    );
  }

  obtenerPuntajesPorPolla(pollaId: string): Observable<Puntaje[]> {
    return this.http.get<Puntaje[]>(`${this.API_URL}?pollaId=${pollaId}`).pipe(
      tap(puntajes => console.log('📊 Puntajes de la polla:', puntajes)),
      catchError(error => {
        console.error('❌ Error obteniendo puntajes:', error);
        return of([]);
      })
    );
  }

  private obtenerPuntajesPorUsuario(userId: string): Observable<Puntaje[]> {
    return this.http.get<Puntaje[]>(`${this.API_URL}?userId=${userId}`).pipe(
      catchError(error => {
        console.error('❌ Error obteniendo puntajes del usuario:', error);
        return of([]);
      })
    );
  }

  private obtenerPuntajeExistente(pollaId: string, userId: string): Observable<Puntaje | null> {
    return this.http.get<Puntaje[]>(`${this.API_URL}?pollaId=${pollaId}&userId=${userId}`).pipe(
      map(puntajes => puntajes[0] || null),
      catchError(() => of(null))
    );
  }

  private actualizarPuntajeTotal(): void {
    const puntajes = this.puntajesPorPollaSubject.getValue();
    const total = Array.from(puntajes.values())
      .reduce((sum, p) => sum + Number(p), 0); // Ensure numbers in reduction
    this.puntajeTotalSubject.next(total);
  }
}
